package repository

import (
	"context"
	"time"

	"attachment-service/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Repository interface {
	Create(ctx context.Context, attachment *models.Attachment) error
	GetByID(ctx context.Context, id string) (*models.Attachment, error)
	GetByMessageID(ctx context.Context, messageID string) ([]*models.Attachment, error)
	GetByChannelID(ctx context.Context, channelID string, limit, offset int) ([]*models.Attachment, error)
	GetByUserID(ctx context.Context, userID string, limit, offset int) ([]*models.Attachment, error)
	Update(ctx context.Context, id string, update bson.M) error
	UpdateStatus(ctx context.Context, id string, status models.AttachmentStatus) error
	Delete(ctx context.Context, id string) error
	Close() error
}

type MongoRepository struct {
	client     *mongo.Client
	collection *mongo.Collection
}

func NewMongoRepository(url, dbName string) (*MongoRepository, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(url))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	collection := client.Database(dbName).Collection("attachments")

	// Create indexes
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "user_id", Value: 1}}},
		{Keys: bson.D{{Key: "workspace_id", Value: 1}}},
		{Keys: bson.D{{Key: "channel_id", Value: 1}}},
		{Keys: bson.D{{Key: "message_id", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
	}
	_, _ = collection.Indexes().CreateMany(ctx, indexes)

	return &MongoRepository{
		client:     client,
		collection: collection,
	}, nil
}

func (r *MongoRepository) Create(ctx context.Context, attachment *models.Attachment) error {
	attachment.CreatedAt = time.Now()
	attachment.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, attachment)
	if err != nil {
		return err
	}

	attachment.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*models.Attachment, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var attachment models.Attachment
	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&attachment)
	if err != nil {
		return nil, err
	}

	return &attachment, nil
}

func (r *MongoRepository) GetByMessageID(ctx context.Context, messageID string) ([]*models.Attachment, error) {
	cursor, err := r.collection.Find(ctx, bson.M{
		"message_id": messageID,
		"status":     bson.M{"$ne": models.StatusDeleted},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var attachments []*models.Attachment
	if err := cursor.All(ctx, &attachments); err != nil {
		return nil, err
	}

	return attachments, nil
}

func (r *MongoRepository) GetByChannelID(ctx context.Context, channelID string, limit, offset int) ([]*models.Attachment, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := r.collection.Find(ctx, bson.M{
		"channel_id": channelID,
		"status":     models.StatusReady,
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var attachments []*models.Attachment
	if err := cursor.All(ctx, &attachments); err != nil {
		return nil, err
	}

	return attachments, nil
}

func (r *MongoRepository) GetByUserID(ctx context.Context, userID string, limit, offset int) ([]*models.Attachment, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := r.collection.Find(ctx, bson.M{
		"user_id": userID,
		"status":  bson.M{"$ne": models.StatusDeleted},
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var attachments []*models.Attachment
	if err := cursor.All(ctx, &attachments); err != nil {
		return nil, err
	}

	return attachments, nil
}

func (r *MongoRepository) Update(ctx context.Context, id string, update bson.M) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	update["updated_at"] = time.Now()
	_, err = r.collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": update})
	return err
}

func (r *MongoRepository) UpdateStatus(ctx context.Context, id string, status models.AttachmentStatus) error {
	return r.Update(ctx, id, bson.M{"status": status})
}

func (r *MongoRepository) Delete(ctx context.Context, id string) error {
	return r.UpdateStatus(ctx, id, models.StatusDeleted)
}

func (r *MongoRepository) Close() error {
	return r.client.Disconnect(context.Background())
}
