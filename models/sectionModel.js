const mongoose = require('mongoose');

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
    filterType: {
      type: String,
      required: [true, 'Please select filter type'],
      enum: ['fit', 'theme', 'material', 'badge', 'category', 'discount', 'underPrice', 'custom'],
      default: 'fit',
    },
    filterValue: {
      type: String,
      required: [true, 'Please provide filter value (e.g., Oversized Fit, 40, 999, etc.)'],
      trim: true,
    },
    bannerImage: {
      type: String,
      default: '', // Optional promotional banner for the drop/sale
    },
    badgeText: {
      type: String,
      default: '', // e.g. "FLAT 40% OFF", "LIMITED DROP", "FLASH SALE"
    },
    countdownEndsAt: {
      type: Date,
      default: null, // For countdown timers (e.g., Midnight Drop / Flash Sale)
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
      default: true, // Toggle this ON or OFF from Admin
    },
  },
  {
    timestamps: true,
  }
);

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;

