import mongoose from 'mongoose';
import Submission from './src/models/Submission.js';
import dotenv from 'dotenv';
dotenv.config();

const cleanDatabase = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const allSubmissions = await Submission.find().sort({ createdAt: 1 });
  console.log(`Found ${allSubmissions.length} submissions.`);

  const latestSubmissions = {};
  const toDelete = [];

  for (const sub of allSubmissions) {
    let name = sub.studentName.toLowerCase().trim();
    if (name.startsWith('name:')) name = name.replace('name:', '').trim();

    if (latestSubmissions[name]) {
      // Since they are sorted by createdAt ascending, we push the OLD one to delete
      toDelete.push(latestSubmissions[name]._id);
    }
    // Update latest to the current one
    latestSubmissions[name] = sub;
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} old duplicate submissions...`);
    await Submission.deleteMany({ _id: { $in: toDelete } });
    console.log('Cleanup complete!');
  } else {
    console.log('No duplicates found. Database is clean.');
  }

  mongoose.connection.close();
};

cleanDatabase().catch(console.error);
