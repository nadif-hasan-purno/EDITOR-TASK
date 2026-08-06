import mongoose from 'mongoose';
import { CUSTOM_FIELD_TYPES } from './Task.js';

const customFieldDefinitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, required: true, enum: CUSTOM_FIELD_TYPES },
    options: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator(options) {
          return this.type !== 'dropdown' || options.length > 0;
        },
        message: 'Dropdown fields require at least one option.',
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('CustomFieldDefinition', customFieldDefinitionSchema);
