const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ActivitySchema = new Schema({
    actDate: String,
    actType: {
        type: String,
        enum: ['Thumbuped', 'Unthumbuped', 'Created', 'Edited']
    },
    actAuthor: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Activity', ActivitySchema);