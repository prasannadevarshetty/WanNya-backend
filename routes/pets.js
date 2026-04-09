const express = require('express');
const path = require('path');
const Pet = require('../models/Pet');
const { authenticate } = require('../middleware/auth');
const { validatePetCreation } = require('../middleware/validation');
const {
  uploadSingleImageField,
  getFileUrl,
  deleteFile
} = require('../utils/fileUpload');
const router = express.Router();

 // @route   GET /api/pets/breeds
// @desc    Get list of breeds for dogs and cats
// @access  Public
router.get('/breeds', (req, res) => {
  const dogBreeds = [
    "Labrador Retriever", "German Shepherd", "Golden Retriever", "French Bulldog", 
    "Bulldog", "Poodle", "Beagle", "Rottweiler", "German Shorthaired Pointer", 
    "Yorkshire Terrier", "Dachshund", "Siberian Husky", "Great Dane", "Pembroke Welsh Corgi", 
    "Australian Shepherd", "Boxer", "Boston Terrier", "Cavalier King Charles Spaniel", 
    "Shih Tzu", "Pomeranian", "Havanese", "Brittany", "English Cocker Spaniel", 
    "Cocker Spaniel", "English Springer Spaniel", "Bernese Mountain Dog", "Pug", 
    "Miniature Schnauzer", "Shetland Sheepdog", "Collie", "Bichon Frise", "Newfoundland", 
    "Basset Hound", "Mastiff", "Maltese", "Vizsla", "English Setter", "Border Collie", 
    "Rhodesian Ridgeback", "Weimaraner", "West Highland White Terrier", "Chihuahua", 
    "Portuguese Water Dog", "Airedale Terrier", "Soft Coated Wheaten Terrier", "Coton de Tulear", 
    "Dandie Dinmont Terrier", "Glen of Imaal Terrier", "Sealyham Terrier", "Skye Terrier", 
    "Cesky Terrier", "Kerry Blue Terrier", "Irish Terrier", "Bedlington Terrier", "Manchester Terrier", 
    "Welsh Terrier", "Australian Terrier", "Silky Terrier", "Tibetan Terrier", "Lakeland Terrier", 
    "Norfolk Terrier", "Norwich Terrier", "Scottish Terrier", "Cairn Terrier", "Westie", 
    "Patterdale Terrier", "Plott Hound", "Redbone Coonhound", "Bloodhound", 
    "Black and Tan Coonhound", "Treeing Walker Coonhound", "English Foxhound", "Greyhound", 
    "Whippet", "Borzoi", "Saluki", "Sloughi", "Azawakh", "Irish Wolfhound", "Scottish Deerhound", 
    "Basenji", "Pharaoh Hound", "Ibizan Hound", "Norwegian Elkhound", "Finnish Spitz", "Samoyed", 
    "Alaskan Malamute", "Chow Chow", "Shar-Pei", "Shiba Inu", "Akita", 
    "Tosa Inu", "Kai Ken", "Kishu Ken", "Shikoku", "Hokkaido", "Japanese Chin", "Pekingese", 
    "Lhasa Apso", "Tibetan Spaniel", "Doberman Pinscher", 
    "Giant Schnauzer", "Standard Schnauzer", "Neapolitan Mastiff", "Bullmastiff", "Dogue de Bordeaux", "Cane Corso", "Presa Canario", 
    "Fila Brasileiro", "Tosa", "Saint Bernard", "Greater Swiss Mountain Dog", 
    "Appenzeller Sennenhund", "Entlebucher Mountain Dog", "Leonberger", "Hovawart", 
    "German Pinscher", "Affenpinscher", "Brussels Griffon", "Papillon", 
    "English Toy Spaniel", "Bolognese", "Lowchen", "Bichon Bolognese"
  ];

  const catBreeds = [
    "Persian", "Maine Coon", "British Shorthair", "American Shorthair", "Ragdoll", 
    "Bengal", "Siamese", "Abyssinian", "Russian Blue", "Scottish Fold", 
    "Birman", "Oriental Shorthair", "Devon Rex", "American Bobtail", "Selkirk Rex", 
    "Cornish Rex", "Himalayan", "Norwegian Forest Cat", "Manx", "Turkish Angora", 
    "Turkish Van", "Somali", "Ocicat", "Siberian", "Japanese Bobtail", "Chartreux", 
    "Egyptian Mau", "Korat", "Singapura", "Burmese", "Tonkinese", "Balinese", 
    "Javanese", "Colorpoint Shorthair", "Ragamuffin", "LaPerm", "American Curl", 
    "American Wirehair", "American Ringtail", "American Polydactyl", "Australian Mist", 
    "Asian", "Asian Semi-longhair", "Australian Tiffanie", "Bambino", 
    "Bombay", "Brazilian Shorthair", "British Longhair", 
    "Burmilla", "California Spangled", "Chantilly-Tiffany", "Chausie", 
    "Cheetoh", "Colorpoint Longhair", "Cymric", "Cyprus", 
    "Desert Lynx", "Donskoy", "Dragon Li", "Dwelf", "European Shorthair", 
    "Exotic Shorthair", "Foldex", "German Rex", "Havana Brown", "Highlander", 
    "Khao Manee", "Kinkalow", "Kurilian Bobtail", 
    "Lykoi", "Mekong Bobtail", "Minskin", "Munchkin", 
    "Napoleon", "Nebelung", "Neva Masquerade", 
    "Ojos Azules", "Oregon Rex", "Oriental Bicolor", "Oriental Longhair", 
    "Oriental Tabby", "Pantherette", "Pathfinder", "Peterbald", "Pixie-bob", "Poodle Cat", 
    "Raas", "Russian White", "Savannah", 
    "Scottish Straight", "Serengeti", "Serrade Petit", 
    "Snowshoe", "Sokoke", "Sphynx", 
    "Suphalak", "Thai", "Thai Lilac", "Toyger", 
    "Ukrainian Levkoy", "Ussuri", "Van"
  ];

  res.json({
    dogBreeds: [...new Set(dogBreeds)],
    catBreeds: [...new Set(catBreeds)]
  });
});

// All remaining pet routes require authentication
router.use(authenticate);

// @route   GET /api/pets
// @desc    Get all pets for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const pets = await Pet.find({ 
      userId: req.user._id, 
      isActive: true 
    }).sort({ createdAt: -1 });

    // Convert pets to frontend format
    const formattedPets = pets.map(pet => {
      const petObj = pet.toObject();
      if (petObj.dob) {
        const date = new Date(petObj.dob);
        petObj.dob = {
          date: date.getDate().toString(),
          month: (date.getMonth() + 1).toString(),
          year: date.getFullYear().toString()
        };
      }
      return {
        ...petObj,
        id: petObj._id.toString()
      };
    });

    res.json({
      pets: formattedPets,
      count: formattedPets.length
    });
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching pets' 
    });
  }
});

// @route   GET /api/pets/:id
// @desc    Get specific pet
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const pet = await Pet.findOne({ 
      _id: req.params.id, 
      userId: req.user._id,
      isActive: true 
    });

    if (!pet) {
      return res.status(404).json({ 
        message: 'Pet not found' 
      });
    }

    res.json({ pet });
  } catch (error) {
    console.error('Get pet error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid pet ID' 
      });
    }
    res.status(500).json({ 
      message: 'Server error while fetching pet' 
    });
  }
});

// @route   POST /api/pets
// @desc    Create a new pet
// @access  Private
router.post('/', validatePetCreation, async (req, res) => {
  try {
    const petData = {
      ...req.body,
      userId: req.user._id
    };

    // Convert dob object to Date if present
    if (petData.dob && typeof petData.dob === 'object') {
      const { date, month, year } = petData.dob;
      if (date && month && year) {
        petData.dob = new Date(Number(year), Number(month) - 1, Number(date));
      }
    }

    const pet = new Pet(petData);
    await pet.save();

    // Format pet data for frontend
    const petObj = pet.toObject();
    if (petObj.dob) {
      const date = new Date(petObj.dob);
      petObj.dob = {
        date: date.getDate().toString(),
        month: (date.getMonth() + 1).toString(),
        year: date.getFullYear().toString()
      };
    }
    petObj.id = petObj._id.toString();

    res.status(201).json({
      message: 'Pet created successfully',
      pet: petObj
    });
  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({ 
      message: 'Server error while creating pet' 
    });
  }
});

// @route   PUT /api/pets/:id
// @desc    Update pet information
// @access  Private
router.put('/:id', async (req, res) => {
  console.log('🔧 PUT /api/pets/:id called');
  console.log('📝 Request params:', req.params);
  console.log('📝 Request body:', req.body);
  console.log('👤 User from auth middleware:', req.user?._id);
  
  try {
    const pet = await Pet.findOne({ 
      _id: req.params.id, 
      userId: req.user._id,
      isActive: true 
    });

    console.log('🐾 Found pet:', pet ? 'YES' : 'NO');

    if (!pet) {
      console.log('❌ Pet not found');
      return res.status(404).json({ 
        message: 'Pet not found' 
      });
    }

    // Handle DOB conversion if provided
    if (req.body.dob && typeof req.body.dob === 'object') {
      const { date, month, year } = req.body.dob;
      console.log('📅 Processing DOB:', { date, month, year });
      
      if (date && month && year) {
        try {
          // Convert month name to number if needed
          let monthNum = month;
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (monthNames.includes(month)) {
            monthNum = (monthNames.indexOf(month) + 1).toString();
          }
          
          // Validate date components
          const dateNum = Number(date);
          const monthNumVal = Number(monthNum);
          const yearNum = Number(year);
          
          if (isNaN(dateNum) || isNaN(monthNumVal) || isNaN(yearNum)) {
            throw new Error('Invalid date components');
          }
          
          if (monthNumVal < 1 || monthNumVal > 12) {
            throw new Error('Invalid month');
          }
          
          if (dateNum < 1 || dateNum > 31) {
            throw new Error('Invalid day');
          }
          
          const dobDate = new Date(yearNum, monthNumVal - 1, dateNum);
          
          // Validate the created date
          if (isNaN(dobDate.getTime())) {
            throw new Error('Invalid date created');
          }
          
          req.body.dob = dobDate;
          console.log('✅ Successfully converted DOB object to Date:', dobDate);
        } catch (error) {
          console.error('❌ DOB conversion error:', error.message);
          return res.status(400).json({ 
            message: `Invalid date format: ${error.message}` 
          });
        }
      } else {
        console.log('⚠️ DOB object missing required fields');
      }
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'breed', 'type', 'gender', 'dob', 
      'allergies', 'sensitivities', 'photo', 'weight',
      'microchipId', 'vetInfo'
    ];

    console.log('🔄 Applying updates...');
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        console.log(`  - ${field}: ${pet[field]} → ${req.body[field]}`);
        pet[field] = req.body[field];
      }
    });

    console.log('💾 Saving pet...');
    await pet.save();
    console.log('✅ Pet saved successfully');

    // Format the response to match frontend expectations
    // Use toObject() to preserve Date instances (toJSON may serialize Dates to strings)
    const responsePet = pet.toObject();
    if (responsePet.dob) {
      const dobDate = new Date(responsePet.dob);
      responsePet.dob = {
        date: dobDate.getDate().toString(),
        // Use numeric month to match create route and frontend expectations
        month: (dobDate.getMonth() + 1).toString(),
        year: dobDate.getFullYear().toString()
      };
    }
    
    // Ensure consistent ID format like GET route
    responsePet.id = responsePet._id.toString();

    res.json({
      message: 'Pet updated successfully',
      pet: responsePet
    });
  } catch (error) {
    console.error('❌ Update pet error:', error);
    
    // Handle specific error types
    if (error.name === 'CastError') {
      console.error('CastError details:', error);
      return res.status(400).json({ 
        message: 'Invalid pet ID or data format',
        details: error.message 
      });
    }
    
    if (error.name === 'ValidationError') {
      console.error('ValidationError details:', error.message);
      const validationErrors = Object.keys(error.errors).map(field => ({
        field,
        message: error.errors[field].message
      }));
      return res.status(400).json({ 
        message: 'Validation failed',
        details: error.message,
        errors: validationErrors
      });
    }
    
    // Handle general errors
    const errorMessage = error.message || 'Unknown server error';
    console.error('General error details:', {
      name: error.name,
      message: errorMessage,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: 'Server error while updating pet',
      details: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/pets/:id
// @desc    Soft delete pet (mark as inactive)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const pet = await Pet.findOne({ 
      _id: req.params.id, 
      userId: req.user._id,
      isActive: true 
    });

    if (!pet) {
      return res.status(404).json({ 
        message: 'Pet not found' 
      });
    }

    pet.isActive = false;
    await pet.save();

    res.json({
      message: 'Pet deleted successfully'
    });
  } catch (error) {
    console.error('Delete pet error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid pet ID' 
      });
    }
    res.status(500).json({ 
      message: 'Server error while deleting pet' 
    });
  }
});

// @route   POST /api/pets/:id/photo
// @desc    Upload pet photo
// @access  Private
router.post('/:id/photo', uploadSingleImageField('pets', 'photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded. Use field name "photo".' });
    }

    const pet = await Pet.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!pet) {
      // cleanup uploaded file if pet was not found
      deleteFile(req.file.filename, 'pets');
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Remove old photo
    if (pet.photo) {
      // Pass the whole URL to deleteFile, which can handle both local and cloudinary URLs
      deleteFile(pet.photo, 'pets');
    }

    pet.photo = req.file.path;
    await pet.save();

    res.status(200).json({
      message: 'Pet photo uploaded successfully',
      pet,
      photoUrl: pet.photo
    });
  } catch (error) {
    console.error('Upload pet photo error:', error);

    if (error.name === 'MulterError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ 
      message: 'Server error while uploading pet photo' 
    });
  }
});

module.exports = router;
