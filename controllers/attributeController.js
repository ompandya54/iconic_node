import Attribute from '../models/attributeModel.js';

// Default initial streetwear attributes catalog
export const DEFAULT_ATTRIBUTES = [
  // FITS
  { type: 'fit', name: 'Oversized Fit', order: 1 },
  { type: 'fit', name: 'Boxy Cut', order: 2 },
  { type: 'fit', name: 'Relaxed Fit', order: 3 },
  { type: 'fit', name: 'Drop Shoulder', order: 4 },
  { type: 'fit', name: 'Regular Fit', order: 5 },

  // THEMES
  { type: 'theme', name: 'Streetwear', order: 1 },
  { type: 'theme', name: 'Vintage Nostalgia', order: 2 },
  { type: 'theme', name: 'Minimalist Typography', order: 3 },
  { type: 'theme', name: 'Japanese Anime Art', order: 4 },
  { type: 'theme', name: 'Gothic & Cyberpunk', order: 5 },
  { type: 'theme', name: 'Abstract Geometry', order: 6 },
  { type: 'theme', name: 'Acid Wash', order: 7 },

  // BADGES
  { type: 'badge', name: 'NEW DROP', order: 1 },
  { type: 'badge', name: 'BESTSELLER', order: 2 },
  { type: 'badge', name: 'LIMITED', order: 3 },
  { type: 'badge', name: 'ESSENTIAL', order: 4 },
  { type: 'badge', name: 'HOT', order: 5 },
  { type: 'badge', name: 'FLAT 40% OFF', order: 6 },
  { type: 'badge', name: 'ARCHIVE', order: 7 },
  { type: 'badge', name: 'POPULAR', order: 8 },

  // MATERIALS
  { type: 'material', name: '100% French Terry Cotton (240 GSM)', value: '240 GSM', order: 1 },
  { type: 'material', name: 'Heavyweight Combed Cotton (260 GSM)', value: '260 GSM', order: 2 },
  { type: 'material', name: 'Compact Cotton (210 GSM)', value: '210 GSM', order: 3 },
  { type: 'material', name: 'Pre-Shrunk Bio-Washed Cotton (250 GSM)', value: '250 GSM', order: 4 },
  { type: 'material', name: 'Heavy Fleece (380 GSM)', value: '380 GSM', order: 5 },
  { type: 'material', name: 'Silicon Washed Loopknit (280 GSM)', value: '280 GSM', order: 6 },

  // SIZES
  { type: 'size', name: 'XS', order: 1 },
  { type: 'size', name: 'S', order: 2 },
  { type: 'size', name: 'M', order: 3 },
  { type: 'size', name: 'L', order: 4 },
  { type: 'size', name: 'XL', order: 5 },
  { type: 'size', name: 'XXL', order: 6 },
  { type: 'size', name: '3XL', order: 7 },

  // COLORS
  { type: 'color', name: 'Pitch Black', value: '#0a0a0c', order: 1 },
  { type: 'color', name: 'Pure White', value: '#ffffff', order: 2 },
  { type: 'color', name: 'Vintage Charcoal', value: '#24252a', order: 3 },
  { type: 'color', name: 'Acid Grey', value: '#4a4b52', order: 4 },
  { type: 'color', name: 'Slate Blue', value: '#25344d', order: 5 },

  // COLLECTIONS
  { type: 'collection', name: 'Drop 01 - Heavyweight', order: 1 },
  { type: 'collection', name: 'Fall Winter 2026', order: 2 },
  { type: 'collection', name: 'Acid Wash Series', order: 3 },
  { type: 'collection', name: 'Monochrome Signature', order: 4 },
  { type: 'collection', name: 'Limited Capsule', order: 5 },
];

/**
 * @desc    Get all attributes (optionally filtered by ?type=fit)
 * @route   GET /api/attributes
 * @access  Public
 */
export const getAttributes = async (req, res) => {
  try {
    const { type, activeOnly } = req.query;

    const query = {};
    if (type) {
      query.type = type.toLowerCase();
    }
    if (activeOnly === 'true') {
      query.isActive = true;
    }

    let attributes = await Attribute.find(query).sort({ order: 1, name: 1 }).lean();

    // If completely empty database, automatically auto-seed initial defaults
    if (attributes.length === 0 && !type) {
      console.log('Attributes collection is empty. Auto-seeding default streetwear attributes...');
      try {
        await Attribute.insertMany(DEFAULT_ATTRIBUTES);
        attributes = await Attribute.find(query).sort({ order: 1, name: 1 }).lean();
      } catch (seedErr) {
        console.warn('Auto-seed warning:', seedErr.message);
      }
    }

    // Grouping by type for convenient frontend consumption
    const grouped = {
      fits: [],
      themes: [],
      badges: [],
      materials: [],
      sizes: [],
      colors: [],
      collections: [],
    };

    attributes.forEach((attr) => {
      const pluralKey = attr.type.endsWith('s') ? attr.type : `${attr.type}s`;
      if (grouped[pluralKey]) {
        grouped[pluralKey].push(attr);
      }
    });

    res.status(200).json({
      success: true,
      count: attributes.length,
      data: attributes,
      grouped,
    });
  } catch (error) {
    console.error('Error fetching attributes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch attributes',
    });
  }
};

/**
 * @desc    Create a new attribute
 * @route   POST /api/attributes
 * @access  Private/Admin
 */
export const createAttribute = async (req, res) => {
  try {
    const { type, name, value, description, isActive, order } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        success: false,
        message: 'Both attribute type and name are required',
      });
    }

    const cleanType = type.toLowerCase().trim();
    const cleanName = name.trim();

    // Check for existing duplicate
    const existing = await Attribute.findOne({
      type: cleanType,
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An attribute of type "${cleanType}" named "${cleanName}" already exists`,
      });
    }

    const attribute = await Attribute.create({
      type: cleanType,
      name: cleanName,
      value: value || '',
      description: description || '',
      isActive: typeof isActive === 'boolean' ? isActive : true,
      order: Number(order) || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Attribute created successfully',
      data: attribute,
    });
  } catch (error) {
    console.error('Error creating attribute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create attribute',
    });
  }
};

/**
 * @desc    Update an existing attribute
 * @route   PUT /api/attributes/:id
 * @access  Private/Admin
 */
export const updateAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, description, isActive, order } = req.body;

    const attribute = await Attribute.findById(id);
    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: 'Attribute not found',
      });
    }

    if (name) attribute.name = name.trim();
    if (typeof value !== 'undefined') attribute.value = value;
    if (typeof description !== 'undefined') attribute.description = description;
    if (typeof isActive === 'boolean') attribute.isActive = isActive;
    if (typeof order !== 'undefined') attribute.order = Number(order) || 0;

    const updated = await attribute.save();

    res.status(200).json({
      success: true,
      message: 'Attribute updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating attribute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update attribute',
    });
  }
};

/**
 * @desc    Delete an attribute
 * @route   DELETE /api/attributes/:id
 * @access  Private/Admin
 */
export const deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;

    const attribute = await Attribute.findById(id);
    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: 'Attribute not found',
      });
    }

    await Attribute.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Attribute "${attribute.name}" (${attribute.type}) deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting attribute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete attribute',
    });
  }
};

/**
 * @desc    Reset or seed default attributes
 * @route   POST /api/attributes/seed
 * @access  Private/Admin
 */
export const seedAttributes = async (req, res) => {
  try {
    const { overwrite } = req.body;

    if (overwrite) {
      await Attribute.deleteMany({});
    }

    let insertedCount = 0;
    for (const item of DEFAULT_ATTRIBUTES) {
      const exists = await Attribute.findOne({ type: item.type, name: item.name });
      if (!exists) {
        await Attribute.create(item);
        insertedCount++;
      }
    }

    const all = await Attribute.find({}).sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      message: `Attributes seeded successfully (${insertedCount} new added)`,
      totalCount: all.length,
      data: all,
    });
  } catch (error) {
    console.error('Error seeding attributes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed attributes',
    });
  }
};

