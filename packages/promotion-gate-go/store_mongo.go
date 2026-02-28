package promotiongate

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// defaultMongoCollection is used when no collection name is provided to NewMongoStore.
const defaultMongoCollection = "promotion_records"

// MongoStore implements Store using a MongoDB database.
type MongoStore struct {
	col *mongo.Collection
}

// NewMongoStore creates a new MongoStore. If collectionName is empty,
// "promotion_records" is used.
func NewMongoStore(db *mongo.Database, collectionName string) *MongoStore {
	if collectionName == "" {
		collectionName = defaultMongoCollection
	}
	return &MongoStore{col: db.Collection(collectionName)}
}

// Migrate creates the required indexes on the promotion_records collection.
func (s *MongoStore) Migrate(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "to_environment", Value: 1},
				{Key: "service_key", Value: 1},
				{Key: "api_version", Value: 1},
				{Key: "status", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "service_key", Value: 1},
				{Key: "api_version", Value: 1},
				{Key: "created_at", Value: -1},
			},
		},
	}

	_, err := s.col.Indexes().CreateMany(ctx, indexes)
	return err
}

// IsActiveInEnv returns true when at least one ACTIVE record exists for the
// given environment, serviceKey, and apiVersion.
func (s *MongoStore) IsActiveInEnv(ctx context.Context, env, serviceKey, apiVersion string) (bool, error) {
	filter := bson.M{
		"to_environment": env,
		"service_key":    serviceKey,
		"api_version":    apiVersion,
		"status":         "ACTIVE",
	}

	count, err := s.col.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Record inserts a new promotion record with a generated UUID and current timestamp.
func (s *MongoStore) Record(ctx context.Context, rec *PromotionRecord) error {
	rec.ID = uuid.New().String()
	rec.CreatedAt = time.Now().UTC()

	_, err := s.col.InsertOne(ctx, rec)
	return err
}

// History returns the 100 most recent promotion records for a service+version,
// ordered by created_at descending.
func (s *MongoStore) History(ctx context.Context, serviceKey, apiVersion string) ([]PromotionRecord, error) {
	filter := bson.M{
		"service_key": serviceKey,
		"api_version": apiVersion,
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(100)

	cursor, err := s.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var records []PromotionRecord
	if err := cursor.All(ctx, &records); err != nil {
		return nil, err
	}

	return records, nil
}
