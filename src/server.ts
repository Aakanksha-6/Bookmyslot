import express from 'express';
import path from 'path';
import mongoose, { Schema, model, Document } from 'mongoose';
import cors from 'cors';

const app = express();
const host = process.env.HOST || 'localhost';
const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookmyslot';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

interface Booking {
  rollNumber: string;
  studentName: string;
  bookedAt: Date;
}

interface SlotDocument extends Document {
  labName: string;
  date: string;
  time: string;
  totalSeats: number;
  bookings: Booking[];
}

const bookingSchema = new Schema<Booking>({
  rollNumber: { type: String, required: true },
  studentName: { type: String, required: true },
  bookedAt: { type: Date, required: true, default: () => new Date() }
}, { _id: false });

const slotSchema = new Schema<SlotDocument>({
  labName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  totalSeats: { type: Number, required: true, min: 1 },
  bookings: { type: [bookingSchema], default: [] }
});

const Slot = model<SlotDocument>('Slot', slotSchema);

function toSlotResponse(slot: SlotDocument) {
  const bookedCount = slot.bookings.length;
  const availableSeats = Math.max(slot.totalSeats - bookedCount, 0);
  return {
    _id: slot._id,
    labName: slot.labName,
    date: slot.date,
    time: slot.time,
    totalSeats: slot.totalSeats,
    bookedCount,
    availableSeats,
    isAvailable: availableSeats > 0,
    bookings: slot.bookings
  };
}

app.post('/slot', async (req, res) => {
  const { labName, date, time, totalSeats } = req.body;
  if (!labName || !date || !time || !totalSeats) {
    return res.status(400).json({ error: 'labName, date, time, and totalSeats are required.' });
  }

  const slot = new Slot({ labName, date, time, totalSeats, bookings: [] });
  await slot.save();
  return res.status(201).json(toSlotResponse(slot));
});

app.get('/slots', async (req, res) => {
  const slots = await Slot.find().sort({ date: 1, time: 1 });
  return res.json(slots.map(toSlotResponse));
});

app.post('/book', async (req, res) => {
  const { slotId, rollNumber, studentName } = req.body;
  if (!slotId || !rollNumber || !studentName) {
    return res.status(400).json({ error: 'slotId, rollNumber, and studentName are required.' });
  }

  const slot = await Slot.findById(slotId);
  if (!slot) {
    return res.status(404).json({ error: 'Slot not found.' });
  }

  if (slot.bookings.some(b => b.rollNumber === rollNumber)) {
    return res.status(400).json({ error: 'Roll number already booked for this slot.' });
  }

  if (slot.bookings.length >= slot.totalSeats) {
    return res.status(400).json({ error: 'No seats available for this slot.' });
  }

  slot.bookings.push({ rollNumber, studentName, bookedAt: new Date() });
  await slot.save();
  return res.json(toSlotResponse(slot));
});

app.post('/cancel', async (req, res) => {
  const { slotId, rollNumber } = req.body;
  if (!slotId || !rollNumber) {
    return res.status(400).json({ error: 'slotId and rollNumber are required.' });
  }

  const slot = await Slot.findById(slotId);
  if (!slot) {
    return res.status(404).json({ error: 'Slot not found.' });
  }

  const originalCount = slot.bookings.length;
  slot.bookings = slot.bookings.filter(b => b.rollNumber !== rollNumber);
  if (slot.bookings.length === originalCount) {
    return res.status(404).json({ error: 'Booking not found for this roll number.' });
  }

  await slot.save();
  return res.json(toSlotResponse(slot));
});

app.get('/bookings', async (req, res) => {
  const rollNumber = String(req.query.rollNumber || '').trim();
  const slots = await Slot.find();

  const bookings = slots.flatMap(slot =>
    slot.bookings
      .filter(booking => !rollNumber || booking.rollNumber === rollNumber)
      .map(booking => ({
        slotId: slot._id,
        labName: slot.labName,
        date: slot.date,
        time: slot.time,
        totalSeats: slot.totalSeats,
        rollNumber: booking.rollNumber,
        studentName: booking.studentName,
        bookedAt: booking.bookedAt
      }))
  );

  return res.json(bookings);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

mongoose.connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB:', mongoUri);
    app.listen(port, host, () => {
      console.log(`Server running on http://${host}:${port}`);
    });
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
