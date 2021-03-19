const bodyParser = require('body-parser');
const express = require('express');
var routes = require("./routes.js");
const cors = require('cors');

const app = express();

app.use(cors({credentials: true, origin: '*'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

/* ---------------------------------------------------------------- */
/* ------------------- Route handler registration ----------------- */
/* ---------------------------------------------------------------- */


// app.get('/devTest', routes.getConnection);

/* ---- (Dashboard) ---- */
// The route localhost:8081/genres is registered to the function
// routes.getAllCategories, specified in routes.js.
// app.get('/home', );


/* ---- Category list page ---- */
/* clear tests */
app.get('/category', routes.getAllCategories);



/* ---- All books for one category  ---- */
/* clear tests */
app.get('/category/i/:cid', routes.getAllBooksForCategory);



/* ---- Author list page ---- */
/* clear tests */
app.get('/author', routes.getAllAuthors);
// app.get('/authors(/page/:p)?', routes.getAllAuthors);



/* ---- All books for one author  ---- */
/* clear tests */
app.get('/author/i/:aid', routes.getAllBooksForAuthor);



/* ---- Search author page ---- */
/* clear tests */
app.get('/search/author/:author', routes.searchAuthor);



/* ---- Search book page ---- */
/* clear tests */
app.get('/search/book/:book', routes.searchBook);



/* ---- Category page - top 10 rated books and their authors in a category ---- */
/* clear tests */
app.get('/category/top/:category', routes.getTopBooksInCategory);



/* ---- Advanced finder - constrained by budget ---- */
/* clear tests */
app.get('/advancedfinder/budget/:category/:budget', routes.getRecommendByBudget);



/* ---- Advanced finder - constrained by age ---- */
/* clear tests */
app.get('/advancedfinder/age/:category/:min/:max', routes.getRecommendByAge);



/* ---- Random books page ---- */
/* clear tests */
app.get('/randombooks', routes.getRandomBooks);



/* ---- Book info page ---- */
/* clear tests */
app.get('/book/:isbn', routes.getBookInfo);


/* ---- Get Related book page ---- */
/* clear tests */
app.get('/related/book/:isbn', routes.getRelatedBooks);

/* ---- Book info page ---- */
/* clear tests */
app.get('/recommendation', routes.getRecommendBook);



app.listen(8081, () => {
	console.log(`Server listening on PORT 8081`);
});