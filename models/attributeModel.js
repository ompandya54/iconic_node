import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Attribute type is required'],
      enum: {
        values: ['fit', 'theme', 'badge', 'material', 'size', 'color', 'collection'],
        message: '{VALUE} is not a valid attribute type',
      },
      index: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Attribute name is required'],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    value: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug from name if not provided
attributeSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Ensure combination of type and name is unique
attributeSchema.index({ type: 1, name: 1 }, { unique: true });

const Attribute = mongoose.model('Attribute', attributeSchema);

export default Attribute;

