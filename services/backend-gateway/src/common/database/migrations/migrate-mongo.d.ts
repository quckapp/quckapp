declare module 'migrate-mongo' {
  interface MigrationStatus {
    fileName: string;
    appliedAt: Date | null;
  }

  interface MigrateMongoConfig {
    mongodb: {
      url: string;
      options?: Record<string, any>;
    };
    migrationsDir: string;
    changelogCollectionName: string;
    migrationFileExtension: string;
    useFileHash: boolean;
  }

  interface DatabaseConnection {
    db: any;
    client: any;
  }

  const config: {
    set(config: MigrateMongoConfig): void;
    read(): MigrateMongoConfig;
  };

  const database: {
    connect(): Promise<DatabaseConnection>;
  };

  function up(db: any, client?: any): Promise<string[]>;
  function down(db: any, client?: any): Promise<string[]>;
  function status(db: any): Promise<MigrationStatus[]>;
  function create(name: string): Promise<string>;

  export { config, database, up, down, status, create };
}
