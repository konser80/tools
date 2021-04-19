const useful = require ('./useful.js');

useful.async_retry(3, 1000, sheetload)
.then( () => {
  // continue normal work
  test1()
})
.catch( (err) => {
  console.error(err.message);
})
