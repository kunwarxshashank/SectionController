// section.model.js
import mongoose from 'mongoose'
import admins from './userSchema' 

const TrainSchema = new mongoose.Schema({
  train_id: String,
  train_name: String,
  train_type: String,
  track: String,
  current_speed: Number,
  scheduled_arrival: String,
  scheduled_departure: String,
  actual_arrival: String,
  actual_departure: String,
  status: String,
  passenger_count: Number,
  is_emergency: Boolean,
  has_critical_cargo: Boolean,
  timestamp: Number,
  processed_at: String,
  description: String,
  priority: String,
  confidence: String,
  action_type: String,
  direction:String,
  current_delay: {
    delay: Number,
    delay_type: String,
    delay_reason: String,
    delay_status: String
  }
});

const SectionSchema = new mongoose.Schema({
  _id:ref,
  section_id: String,
  section_name: String,
  coordinates: [Number],
  trains: [TrainSchema] ,
  track:[
    {
        dir:String,
        trackNo : Number,
    }
  ],
  upSection:{
        type: mongoose.Types.ObjectId,
        ref :section,
        required:true,
    }, 
  downSection: {
        type: mongoose.Types.ObjectId,
        ref :section,
        required:true,
    },
    

});

module.exports = mongoose.model("Section", SectionSchema);
