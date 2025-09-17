/**
 * Storage Schemas (DB)
 * 
 * Defines normalized database schemas for session storage.
 * Supports both SQL and document store implementations.
 */

class StorageSchemaManager {
  constructor() {
    this.schemas = this.initializeSchemas();
  }

  /**
   * Initialize all storage schemas
   */
  initializeSchemas() {
    return {
      sessions: this.getSessionsSchema(),
      answers: this.getAnswersSchema(),
      final_snapshots: this.getFinalSnapshotsSchema(),
      analytics_events: this.getAnalyticsEventsSchema(),
      bank_packages: this.getBankPackagesSchema(),
      gating_assignments: this.getGatingAssignmentsSchema(),
      error_logs: this.getErrorLogsSchema(),
      performance_metrics: this.getPerformanceMetricsSchema()
    };
  }

  /**
   * Sessions table schema
   */
  getSessionsSchema() {
    return {
      table: 'sessions',
      pk: 'session_id',
      fields: {
        session_id: { type: 'uuid', required: true, unique: true },
        bank_id: { type: 'string', required: true, index: true },
        bank_hash_sha256: { type: 'string', required: true, index: true },
        state: { type: 'string', required: true, index: true },
        started_at: { type: 'datetime', required: true, index: true },
        finalized_at: { type: 'datetime', nullable: true, index: true },
        picked_families: { type: 'jsonb', required: true },
        schedule: { type: 'jsonb', required: true },
        constants_profile: { type: 'string', required: true },
        gating_assignments: { type: 'jsonb', nullable: true },
        created_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' },
        updated_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' }
      },
      indexes: [
        { name: 'idx_sessions_bank_id', columns: ['bank_id'] },
        { name: 'idx_sessions_state', columns: ['state'] },
        { name: 'idx_sessions_started_at', columns: ['started_at'] },
        { name: 'idx_sessions_finalized_at', columns: ['finalized_at'] },
        { name: 'idx_sessions_bank_hash', columns: ['bank_hash_sha256'] }
      ],
      constraints: [
        { name: 'chk_sessions_state', check: "state IN ('INIT', 'PICKED', 'IN_PROGRESS', 'PAUSED', 'FINALIZING', 'FINALIZED', 'ABORTED')" },
        { name: 'chk_sessions_picked_families', check: "jsonb_array_length(picked_families) BETWEEN 1 AND 7" }
      ]
    };
  }

  /**
   * Answers table schema
   */
  getAnswersSchema() {
    return {
      table: 'answers',
      pk: ['session_id', 'qid'],
      fields: {
        session_id: { type: 'uuid', required: true, fk: 'sessions(session_id)' },
        qid: { type: 'string', required: true },
        familyScreen: { type: 'string', required: true, index: true },
        picked_key: { type: 'string', required: true },
        lineCOF: { type: 'string', required: true },
        faces: { type: 'jsonb', required: true },
        tells: { type: 'jsonb', nullable: true },
        ts: { type: 'datetime', required: true, index: true },
        latency_ms: { type: 'int', nullable: true },
        created_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' },
        updated_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' }
      },
      indexes: [
        { name: 'idx_answers_session_id', columns: ['session_id'] },
        { name: 'idx_answers_family_screen', columns: ['familyScreen'] },
        { name: 'idx_answers_ts', columns: ['ts'] },
        { name: 'idx_answers_session_family', columns: ['session_id', 'familyScreen'] }
      ],
      constraints: [
        { name: 'chk_answers_picked_key', check: "picked_key IN ('A', 'B')" },
        { name: 'chk_answers_linecof', check: "lineCOF IN ('C', 'O', 'F')" },
        { name: 'chk_answers_latency', check: "latency_ms >= 0" }
      ]
    };
  }

  /**
   * Final snapshots table schema
   */
  getFinalSnapshotsSchema() {
    return {
      table: 'final_snapshots',
      pk: 'session_id',
      fields: {
        session_id: { type: 'uuid', required: true, fk: 'sessions(session_id)' },
        bank_id: { type: 'string', required: true, index: true },
        bank_hash_sha256: { type: 'string', required: true, index: true },
        line_verdicts: { type: 'jsonb', required: true },
        face_states: { type: 'jsonb', required: true },
        family_reps: { type: 'jsonb', required: true },
        anchor_family: { type: 'string', nullable: true },
        finalized_at: { type: 'datetime', required: true, index: true },
        processing_time_ms: { type: 'int', nullable: true },
        qa_flags: { type: 'jsonb', nullable: true },
        created_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' }
      },
      indexes: [
        { name: 'idx_final_snapshots_bank_id', columns: ['bank_id'] },
        { name: 'idx_final_snapshots_finalized_at', columns: ['finalized_at'] },
        { name: 'idx_final_snapshots_bank_hash', columns: ['bank_hash_sha256'] }
      ]
    };
  }

  /**
   * Analytics events table schema
   */
  getAnalyticsEventsSchema() {
    return {
      table: 'analytics_events',
      pk: 'id',
      fields: {
        id: { type: 'bigint', required: true, auto_increment: true },
        session_id: { type: 'uuid', required: true, fk: 'sessions(session_id)', index: true },
        event_type: { type: 'string', required: true, index: true },
        event_data: { type: 'jsonb', required: true },
        ts: { type: 'datetime', required: true, index: true },
        created_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' }
      },
      indexes: [
        { name: 'idx_analytics_session_id', columns: ['session_id'] },
        { name: 'idx_analytics_event_type', columns: ['event_type'] },
        { name: 'idx_analytics_ts', columns: ['ts'] },
        { name: 'idx_analytics_session_type', columns: ['session_id', 'event_type'] }
      ]
    };
  }

  /**
   * Bank packages table schema
   */
  getBankPackagesSchema() {
    return {
      table: 'bank_packages',
      pk: 'bank_id',
      fields: {
        bank_id: { type: 'string', required: true, unique: true },
        bank_hash_sha256: { type: 'string', required: true, unique: true },
        version: { type: 'string', required: true },
        package_data: { type: 'jsonb', required: true },
        signature: { type: 'text', required: true },
        created_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' },
        deployed_at: { type: 'datetime', nullable: true },
        deprecated_at: { type: 'datetime', nullable: true }
      },
      indexes: [
        { name: 'idx_bank_packages_hash', columns: ['bank_hash_sha256'] },
        { name: 'idx_bank_packages_version', columns: ['version'] },
        { name: 'idx_bank_packages_created_at', columns: ['created_at'] },
        { name: 'idx_bank_packages_deployed_at', columns: ['deployed_at'] }
      ]
    };
  }

  /**
   * Gating assignments table schema
   */
  getGatingAssignmentsSchema() {
    return {
      table: 'gating_assignments',
      pk: ['session_id', 'experiment_id'],
      fields: {
        session_id: { type: 'uuid', required: true, fk: 'sessions(session_id)' },
        experiment_id: { type: 'string', required: true },
        arm: { type: 'string', required: true },
        config_profile: { type: 'string', required: true },
        assigned_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' }
      },
      indexes: [
        { name: 'idx_gating_session_id', columns: ['session_id'] },
        { name: 'idx_gating_experiment_id', columns: ['experiment_id'] },
        { name: 'idx_gating_arm', columns: ['arm'] },
        { name: 'idx_gating_config_profile', columns: ['config_profile'] }
      ]
    };
  }

  /**
   * Error logs table schema
   */
  getErrorLogsSchema() {
    return {
      table: 'error_logs',
      pk: 'id',
      fields: {
        id: { type: 'bigint', required: true, auto_increment: true },
        session_id: { type: 'uuid', nullable: true, fk: 'sessions(session_id)', index: true },
        error_code: { type: 'string', required: true, index: true },
        error_message: { type: 'text', required: true },
        stack_trace: { type: 'text', nullable: true },
        context: { type: 'jsonb', nullable: true },
        severity: { type: 'string', required: true, index: true },
        ts: { type: 'datetime', required: true, index: true },
        created_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' }
      },
      indexes: [
        { name: 'idx_error_logs_session_id', columns: ['session_id'] },
        { name: 'idx_error_logs_error_code', columns: ['error_code'] },
        { name: 'idx_error_logs_severity', columns: ['severity'] },
        { name: 'idx_error_logs_ts', columns: ['ts'] }
      ],
      constraints: [
        { name: 'chk_error_logs_severity', check: "severity IN ('low', 'medium', 'high', 'critical')" }
      ]
    };
  }

  /**
   * Performance metrics table schema
   */
  getPerformanceMetricsSchema() {
    return {
      table: 'performance_metrics',
      pk: 'id',
      fields: {
        id: { type: 'bigint', required: true, auto_increment: true },
        session_id: { type: 'uuid', nullable: true, fk: 'sessions(session_id)', index: true },
        operation: { type: 'string', required: true, index: true },
        duration_ms: { type: 'int', required: true },
        success: { type: 'boolean', required: true, index: true },
        metadata: { type: 'jsonb', nullable: true },
        ts: { type: 'datetime', required: true, index: true },
        created_at: { type: 'datetime', required: true, default: 'CURRENT_TIMESTAMP' }
      },
      indexes: [
        { name: 'idx_performance_session_id', columns: ['session_id'] },
        { name: 'idx_performance_operation', columns: ['operation'] },
        { name: 'idx_performance_success', columns: ['success'] },
        { name: 'idx_performance_ts', columns: ['ts'] },
        { name: 'idx_performance_operation_ts', columns: ['operation', 'ts'] }
      ],
      constraints: [
        { name: 'chk_performance_duration', check: 'duration_ms >= 0' }
      ]
    };
  }

  /**
   * Get schema for a specific table
   */
  getSchema(tableName) {
    return this.schemas[tableName];
  }

  /**
   * Get all schemas
   */
  getAllSchemas() {
    return this.schemas;
  }

  /**
   * Generate SQL DDL for all tables
   */
  generateSQLDDL(databaseType = 'postgresql') {
    const ddl = [];
    
    for (const [tableName, schema] of Object.entries(this.schemas)) {
      ddl.push(this.generateTableDDL(tableName, schema, databaseType));
    }
    
    return ddl.join('\n\n');
  }

  /**
   * Generate SQL DDL for a specific table
   */
  generateTableDDL(tableName, schema, databaseType = 'postgresql') {
    const ddl = [];
    
    // Create table
    ddl.push(`CREATE TABLE ${schema.table} (`);
    
    const fieldDefs = [];
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      let fieldDefStr = `  ${fieldName} ${this.getSQLType(fieldDef.type, databaseType)}`;
      
      if (fieldDef.required && !fieldDef.auto_increment) {
        fieldDefStr += ' NOT NULL';
      }
      
      if (fieldDef.unique) {
        fieldDefStr += ' UNIQUE';
      }
      
      if (fieldDef.default) {
        fieldDefStr += ` DEFAULT ${fieldDef.default}`;
      }
      
      fieldDefs.push(fieldDefStr);
    }
    
    ddl.push(fieldDefs.join(',\n'));
    
    // Primary key
    if (Array.isArray(schema.pk)) {
      ddl.push(`  PRIMARY KEY (${schema.pk.join(', ')})`);
    } else {
      ddl.push(`  PRIMARY KEY (${schema.pk})`);
    }
    
    ddl.push(');');
    
    // Indexes
    for (const index of schema.indexes || []) {
      ddl.push(`CREATE INDEX ${index.name} ON ${schema.table} (${index.columns.join(', ')});`);
    }
    
    // Constraints
    for (const constraint of schema.constraints || []) {
      ddl.push(`ALTER TABLE ${schema.table} ADD CONSTRAINT ${constraint.name} CHECK (${constraint.check});`);
    }
    
    return ddl.join('\n');
  }

  /**
   * Get SQL type for field type
   */
  getSQLType(fieldType, databaseType) {
    const typeMap = {
      'postgresql': {
        'uuid': 'UUID',
        'string': 'VARCHAR(255)',
        'text': 'TEXT',
        'int': 'INTEGER',
        'bigint': 'BIGINT',
        'datetime': 'TIMESTAMP',
        'jsonb': 'JSONB',
        'boolean': 'BOOLEAN'
      },
      'mysql': {
        'uuid': 'CHAR(36)',
        'string': 'VARCHAR(255)',
        'text': 'TEXT',
        'int': 'INT',
        'bigint': 'BIGINT',
        'datetime': 'DATETIME',
        'jsonb': 'JSON',
        'boolean': 'BOOLEAN'
      },
      'sqlite': {
        'uuid': 'TEXT',
        'string': 'TEXT',
        'text': 'TEXT',
        'int': 'INTEGER',
        'bigint': 'INTEGER',
        'datetime': 'TEXT',
        'jsonb': 'TEXT',
        'boolean': 'INTEGER'
      }
    };
    
    return typeMap[databaseType]?.[fieldType] || fieldType.toUpperCase();
  }

  /**
   * Generate MongoDB collection schemas
   */
  generateMongoSchemas() {
    const schemas = {};
    
    for (const [tableName, schema] of Object.entries(this.schemas)) {
      schemas[tableName] = {
        collection: schema.table,
        indexes: schema.indexes?.map(idx => ({
          keys: idx.columns.reduce((acc, col) => ({ ...acc, [col]: 1 }), {}),
          options: { name: idx.name }
        })) || [],
        validation: this.generateMongoValidation(schema)
      };
    }
    
    return schemas;
  }

  /**
   * Generate MongoDB validation schema
   */
  generateMongoValidation(schema) {
    const properties = {};
    const required = [];
    
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      properties[fieldName] = {
        bsonType: this.getMongoType(fieldDef.type),
        description: `${fieldName} field`
      };
      
      if (fieldDef.required) {
        required.push(fieldName);
      }
    }
    
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: required,
        properties: properties
      }
    };
  }

  /**
   * Get MongoDB type for field type
   */
  getMongoType(fieldType) {
    const typeMap = {
      'uuid': 'string',
      'string': 'string',
      'text': 'string',
      'int': 'int',
      'bigint': 'long',
      'datetime': 'date',
      'jsonb': 'object',
      'boolean': 'bool'
    };
    
    return typeMap[fieldType] || 'string';
  }

  /**
   * Generate migration scripts
   */
  generateMigrationScripts(fromVersion, toVersion) {
    return {
      up: this.generateUpMigration(fromVersion, toVersion),
      down: this.generateDownMigration(fromVersion, toVersion)
    };
  }

  /**
   * Generate up migration
   */
  generateUpMigration(fromVersion, toVersion) {
    // Implementation would generate migration scripts
    // This is a placeholder for the actual migration logic
    return `-- Migration from ${fromVersion} to ${toVersion}\n-- Add your migration SQL here`;
  }

  /**
   * Generate down migration
   */
  generateDownMigration(fromVersion, toVersion) {
    // Implementation would generate rollback scripts
    return `-- Rollback from ${toVersion} to ${fromVersion}\n-- Add your rollback SQL here`;
  }
}

module.exports = StorageSchemaManager;
