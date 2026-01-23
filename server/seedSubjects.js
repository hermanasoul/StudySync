// server/seedSubjects.js

require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('./models/Subject');

const seedSubjects = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('Connected to MongoDB');

    await Subject.deleteMany({});

    const subjects = [
      {
        name: 'Биология',
        description: 'Изучение живых организмов',
        color: 'green',
        icon: '🧬'
      },
      {
        name: 'Химия',
        description: 'Изучение веществ и их свойств',
        color: 'blue',
        icon: '🧪'
      },
      {
        name: 'Математика',
        description: 'Изучение чисел и вычислений',
        color: 'purple',
        icon: '📐'
      }
    ];

    const testUserId = new mongoose.Types.ObjectId('000000000000000000000001');

    for (let subject of subjects) {
      subject.createdBy = testUserId;
      await Subject.create(subject);
    }

    console.log('Test subjects created successfully!');
    
    const createdSubjects = await Subject.find({});
    console.log('Created subjects:');
    createdSubjects.forEach(subject => {
      console.log(`- ${subject.name} (ID: ${subject._id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding subjects:', error);
    process.exit(1);
  }
};

seedSubjects();