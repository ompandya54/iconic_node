import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide section title'],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
    },
    // Multi-variable targeting criteria (optional dropdowns)
    category: {
      type: String,
      trim: true,
      default: '',
    },
    fit: {
      type: String,
      trim: true,
      default: '',
    },
    theme: {
      type: String,
      trim: true,
      default: '',
    },
    collectionName: {
      type: String,
      trim: true,
      default: '',
    },
    // Legacy single filter support
    filterType: {
      type: String,
      default: '',
    },
    filterValue: {
      type: String,
      default: '',
      trim: true,
    },
    bannerImage: {
      type: String,
      default: '',
    },
    badgeText: {
      type: String,
      default: '', // e.g. "FLAT 40% OFF", "LIMITED DROP", "FLASH SALE"
    },
    countdownEndsAt: {
      type: Date,
      default: null,
    },
    limit: {
      type: Number,
      default: 8,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed index for active landing page sections ordered by displayOrder
sectionSchema.index({ isActive: 1, displayOrder: 1 });

const Section = mongoose.model('Section', sectionSchema);

export default Section;
export { Section };
