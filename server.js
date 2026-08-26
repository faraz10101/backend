const app = require('./src/app');
const connectDB = require('./src/db/db');


connectDB();

app.listen(5000, () => {
    console.log('Server is running on port 5000');
})