import mongoose from 'mongoose';

export const TASK_STATUSES = [
  'Todo',
  'Pending',
  'In Revision',
  'Approved',
  'Cancelled',
];

export const TASK_PRIORITIES = ['low', 'medium', 'high'];

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'url', 'date', 'dropdown'];

const customFieldSchema = new mongoose.Schema(
  {
    definitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomFieldDefinition',
      default: null,
    },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: CUSTOM_FIELD_TYPES },
    value: { type: mongoose.Schema.Types.Mixed, default: '' },
    options: [{ type: String, trim: true }],
  },
  { _id: true }
);

const optionalUrlValidator = {
  validator(value) {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  message: 'Please provide a valid http(s) URL.',
};

const taskSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, trim: true },
    /** Primary / display editor (first of editorNames). Kept for older records & CSV. */
    editorName: { type: String, required: true, trim: true },
    /** All assigned editors for collab projects. */
    editorNames: {
      type: [{ type: String, trim: true }],
      default: undefined,
      validate: {
        validator(value) {
          if (value === undefined || value === null) return true;
          return Array.isArray(value) && value.every((name) => String(name || '').trim());
        },
        message: 'editorNames must be an array of non-empty names.',
      },
    },
    projectName: { type: String, required: true, trim: true },
    googleDocLink: {
      type: String,
      trim: true,
      default: '',
      validate: optionalUrlValidator,
    },
    deadlineDays: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: TASK_STATUSES, default: 'Todo' },
    priority: { type: String, required: true, enum: TASK_PRIORITIES, default: 'medium' },
    pinned: { type: Boolean, default: false },
    notes: { type: String, default: '', trim: true },
    frameIoLink: {
      type: String,
      trim: true,
      default: '',
      validate: optionalUrlValidator,
    },
    description: { type: String, default: '', trim: true },
    customFields: { type: [customFieldSchema], default: [] },
  },
  { timestamps: true }
);

taskSchema.index({ status: 1, clientName: 1, editorName: 1 });
taskSchema.index({ editorNames: 1 });

export default mongoose.model('Task', taskSchema);
