const mongoose = require('mongoose');

const uri = 'mongodb+srv://abhi2211:3302%40nsut@cluster0.ittfkkc.mongodb.net/smart_parking?appName=Cluster0';

mongoose.connect(uri)
  .then(() => {
    console.log('✅ MongoDB connection successful');
    mongoose.connection.close();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
  });