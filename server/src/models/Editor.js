import mongoose from 'mongoose';

export const DEFAULT_EDITORS = [
  { name: 'Ashik', color: '#4f6fe8' },
  { name: 'Amiyo', color: '#0d9488' },
  { name: 'Pranto', color: '#7c3aed' },
  { name: 'Rasel', color: '#ea580c' },
  { name: 'Fahim', color: '#db2777' },
  { name: 'Thumbnail designer', color: '#059669' },
];

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

const editorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    color: {
      type: String,
      required: true,
      trim: true,
      default: '#4f6fe8',
      validate: {
        validator(value) {
          return HEX_COLOR.test(String(value || ''));
        },
        message: 'Color must be a hex value like #4f6fe8.',
      },
    },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

editorSchema.index({ active: 1, sortOrder: 1, name: 1 });

export default mongoose.model('Editor', editorSchema);
