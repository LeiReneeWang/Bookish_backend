var config = require('./db-config.js');
var mysql = require('mysql2');
var NodeCache = require('node-cache');
var hash = require('object-hash');

const ENABLE_CACHE = 1;
const _Cache = new NodeCache();
config.connectionLimit = 100;
var connection = mysql.createPool(config);
let listPaging = 20;
let gridPaging = 12;

/* -------------------------------------------------- */
/* ------------------- Route Handlers --------------- */
/* -------------------------------------------------- */


const _Hash = (sql, args) => {
  obj = {_s: sql, _r: args };
  return hash.sha1(obj);
}

/**
 * Modern Promise call for MySQL2
 * @param {*} sql - SQL query
 * @param {*} args - args here
 */
const NQuery = (sql, args) => {
  return new Promise((resolve, reject) => {
    let hashCode = _Hash(sql, args);
    // Caching function
    if (ENABLE_CACHE && _Cache.has(hashCode)) {
      resolve(_Cache.get(hashCode));
    } else {
      // Not cached get from DB
      connection.query(sql, args, (err, data) => {
        if (err) return reject(err);
        if (ENABLE_CACHE) _Cache.set(hashCode, data);
        resolve(data);
      })
    }
  })
}


/* ---- Category list page ---- */
// -----------------------------------------
// !!! OPTIMIZATION_CASE: categorylist
// -----------------------------------------
function getAllCategories(req, res) {
  let page = (req.query.p) ? req.query.p : 1;
  let skip = (page-1) * listPaging;
  let data = {max_page: 1, payload: []}

  // OLD
  // var query1=`
  // SELECT DISTINCT category.category_id AS id, category.name AS name, FORMAT(COUNT(DISTINCT BC.book_id),0) AS bookNum
  // FROM   book_in_category BC JOIN category ON BC.category_id = category.category_id
  // GROUP BY category.category_id
  // LIMIT ?, ?;
  // `;

  var query1=`
    SELECT c.category_id AS id, c.name AS name, bookNum
    FROM   (SELECT bic.category_id, FORMAT(COUNT(DISTINCT bic.book_id),0) AS bookNum
            FROM book_in_category bic
            GROUP BY bic.category_id) BC
            JOIN category c ON BC.category_id = c.category_id
    ORDER BY c.category_id
    LIMIT ?, ?;
  `;
  var query2=`SELECT count(*) AS max_items FROM category`;

  Promise.all([
    NQuery(query1, [skip, listPaging]),
    NQuery(query2, [])
  ]).then((result) => {
    data.payload = result[0];
    data.max_page = (result[1].length===0 || result[1][0].max_items===0) ? 1 : Math.ceil(result[1][0].max_items / listPaging);
    res.json(data);
  }).catch(err => {
    console.log(err);
    return res.status(400).json({err: 1});
  })

  // connection.query(query1, [skip, listPaging],  (err, results) => {
  //   if (err) console.log(err);
  //   else {
  //     data.payload = results;
  //     connection.query(query2, (err, result) => {
  //       if (err) console.log(err);
  //       else {
  //         data.max_page = (result.length===0) ? 1 :Math.ceil(result[0].max_items / listPaging);
  //         res.json(data);
  //       }
  //     })
  //   }
  // });
};



/* ---- All books for one category  ---- */
function getAllBooksForCategory(req, res) {
  let page = (req.query.p) ? req.query.p : 1;
  let skip = (page-1) * gridPaging;
  let data = {max_page: 1, payload: []}
  var inputCategory = req.params.cid;
  var query1=`
  SELECT book.isbn, book.title, book.cover
  FROM   book JOIN book_in_category BC ON book.isbn = BC.book_id JOIN category ON BC.category_id = category.category_id
  WHERE  category.category_id = ?
  LIMIT ?, ?;
  `;
  var query2=`SELECT count(*) AS max_items
              FROM   book_in_category BC
              WHERE  BC.category_id = ?`;
  
  Promise.all([
    NQuery(query1, [inputCategory, skip, gridPaging]),
    NQuery(query2, [inputCategory])
  ]).then((result) => {
    data.payload = result[0];
    data.max_page = (result[1].length===0 || result[1][0].max_items===0) ? 1 : Math.ceil(result[1][0].max_items / gridPaging);
    res.json(data);
  }).catch(err => {
    console.log(err);
    return res.status(400).json({err: 1});
  })
  
    
  // connection.query(query, [inputCategory, skip, gridPaging], function(err, results) {
  //   if (err) console.log(err);
  //   else {
  //     data.payload = results;
  //     connection.query(query2, [inputCategory], (err, result) => {
  //       if (err) console.log(err);
  //       else {
  //         data.max_page = (result.length===0) ? 1 : Math.ceil(result[0].max_items / gridPaging);
  //         res.json(data);
  //       }
  //     })
  //   }
  // });
};



/* ---- Author list page ---- */
function getAllAuthors(req, res) {
  let page = (req.query.p) ? req.query.p : 1;
  let skip = (page-1) * listPaging;
  let data = {max_page: 1, payload: []}
  var query1=`
    SELECT a.author_id AS id, a.name AS name, bookNum
    FROM   (SELECT awb.author_id, FORMAT(COUNT(DISTINCT awb.book_id),0) AS bookNum
            FROM author_write_book awb
            GROUP BY awb.author_id) BC
            JOIN author a ON BC.author_id = a.author_id
    ORDER BY a.author_id
    LIMIT ?, ?;
  `;
  var query2=`SELECT count(*) AS max_items FROM author`;

  Promise.all([
    NQuery(query1, [skip, listPaging]),
    NQuery(query2, [])
  ]).then((result) => {
    data.payload = result[0];
    data.max_page = (result[1].length===0 || result[1][0].max_items===0) ? 1 : Math.ceil(result[1][0].max_items / listPaging);
    res.json(data);
  }).catch(err => {
    console.log(err);
    return res.status(400).json({err: 1});
  })

  // connection.query(query1, [skip, listPaging], function(err, results) {
  //   if (err) console.log(err);
  //   else {
  //     data.payload = results;
  //     connection.query(query2, (err, result) => {
  //       if (err) console.log(err);
  //       else {
  //         data.max_page = (result.length===0) ? 1 : Math.ceil(result[0].max_items / listPaging);
  //         res.json(data);
  //       }
  //     })
  //   }
  // });
};



/* ---- All books for one author  ---- */
// -----------------------------------------
// !!! OPTIMIZATION_CASE: book_pre_author
// -----------------------------------------
function getAllBooksForAuthor(req, res) {
  let page = (req.query.p) ? req.query.p : 1;
  let skip = (page-1) * gridPaging;
  let data = {max_page: 1, payload: []}
  var inputAuthor = req.params.aid;
  // MUST CREATE INDEX author_write_book_IDX on author_idx(author_id);
  var query1=`
    SELECT b.isbn, b.title, b.cover
    FROM   author_write_book AWB JOIN book b ON AWB.book_id = b.isbn
    WHERE  AWB.author_id = ? 
    LIMIT ?, ?;
  `;
  var query2=`
    SELECT count(*) AS max_items
    FROM author_write_book AWB
    WHERE  AWB.author_id = ?
  `;
  

  // Query
  // var query2=`
  //   SELECT count(*) AS max_items
  //   FROM author_write_book AWB
  //   WHERE  AWB.author_id = ?
  // `;

  // // Old
  // var query1=`
  // SELECT book.isbn, book.title, book.cover
  // FROM   author_write_book AWB JOIN author ON AWB.author_id = author.author_id JOIN book ON AWB.book_id = book.isbn
  // WHERE  author.author_id = ?
  // LIMIT ?, ?;
  // `;
  // var query2=`SELECT count(*) AS max_items 
  //             FROM author_write_book AWB JOIN author ON AWB.author_id = author.author_id JOIN book ON AWB.book_id = book.isbn
  //             WHERE  author.author_id = ?`;
  
  Promise.all([
    NQuery(query1, [inputAuthor, skip, gridPaging]),
    NQuery(query2, [inputAuthor])
  ]).then((result) => {
    data.payload = result[0];
    data.max_page = (result[1].length===0 || result[1][0].max_items===0) ? 1 : Math.ceil(result[1][0].max_items / gridPaging);
    res.json(data);
  }).catch(err => {
    console.log(err);
    return res.status(400).json({err: 1});
  })
  
  // // NO Optimization
  // connection.query(query1, [inputAuthor, skip, gridPaging], function(err, results) {
  //   if (err) console.log(err);
  //   else {
  //     data.payload = results;
  //     connection.query(query2, [inputAuthor], (err, result) => {
  //       if (err) console.log(err);
  //       else {
  //         data.max_page = (result.length===0) ? 1 : Math.ceil(result[0].max_items / gridPaging);
  //         res.json(data);
  //       }
  //     })
  //   }
  // });
};



/* ---- Search author page ---- */
function searchAuthor(req, res) {
  let data = {max_page: 1, payload: []}
  let page = (req.query.p) ? req.query.p : 1;
  let skip = (page-1) * listPaging;
  if (!req.params.author) {
    res.json(data);
  }
  var inputAuthor = `%${req.params.author}%`;
  var query1=`
  SELECT author.author_id AS id, author.name AS name, FORMAT(COUNT(DISTINCT AWB.book_id),0) AS bookNum
  FROM   author_write_book AWB JOIN author ON AWB.author_id = author.author_id
  WHERE  LOWER(author.name) LIKE LOWER(?)
  GROUP BY author.author_id, name
  LIMIT ?, ?;
  `;
  var query2 = `
  SELECT COUNT(*) AS max_items
  FROM   author
  WHERE  LOWER(author.name) LIKE LOWER(?)
  `

  Promise.all([
    NQuery(query1, [inputAuthor, skip, listPaging]),
    NQuery(query2, [inputAuthor])
  ]).then((result) => {
    data.payload = result[0];
    data.max_page = (result[1].length===0 || result[1][0].max_items===0) ? 1 : Math.ceil(result[1][0].max_items / listPaging);
    res.json(data);
  }).catch(err => {
    console.log(err);
    return res.status(400).json({err: 1});
  })

  // Old method
  // connection.query(query, [inputAuthor, skip, listPaging], function(err, results) {
  //   if (err) console.log(err);
  //   else {
  //     data.payload = results;
  //     connection.query(query2, [inputAuthor], (err, result) => {
  //       if (err) console.log(err);
  //       else {
  //         data.max_page = (result.length===0) ? 1 : Math.ceil(result[0].max_items / listPaging);
  //         res.json(data);
  //       }
  //     })
  //   }
  // });
};



/* ---- Search book page ---- */
function searchBook(req, res) {
  let page = (req.query.p) ? req.query.p : 1;
  let skip = (page-1) * gridPaging;
  let data = {max_page : 1, payload: []}
  if (!req.params.book) {
    res.json(data);
  }
  var inputBookText = `%${req.params.book}%`;
  var inputBookNum = req.params.book;
  var query1=`
  SELECT book.isbn, book.title, book.cover
  FROM   book
  WHERE  LOWER(book.title) LIKE LOWER(?) OR book.isbn = ?
  LIMIT  ?, ?;
  `;
  var query2=`
  SELECT COUNT(*) AS max_items
  FROM   book
  WHERE  LOWER(book.title) LIKE LOWER(?) OR book.isbn = ?
  `;

  Promise.all([
    NQuery(query1, [inputBookText, inputBookNum , skip, gridPaging]),
    NQuery(query2, [inputBookText, inputBookNum])
  ]).then((result) => {
    data.payload = result[0];
    data.max_page = (result[1].length===0 || result[1][0].max_items===0) ? 1 : Math.ceil(result[1][0].max_items / gridPaging);
    res.json(data);
  }).catch(err => {
    console.log(err);
    return res.status(400).json({err: 1});
  })

  // Old Method
  // connection.query(query, [inputBookText, inputBookNum , skip, gridPaging], function(err, results) {
  //   if (err) console.log(err);
  //   else {
  //     data.payload = results;
  //     connection.query(query2, [inputBookText, inputBookNum], (err, result) => {
  //       if (err) consol.log(err);
  //       else {
  //         data.max_page = (result.length===0) ? 1 : Math.ceil(result[0].max_items / gridPaging);
  //         res.json(data);
  //       }
  //     })
  //   }
  // });
};



/* ---- Categories page - top 10 books and their authors in a category ---- */
// -----------------------------------------
// !!! OPTIMIZATION_CASE: top_book_in_cat
// -----------------------------------------
// old method
// function getTopBooksInCategory(req, res) {
//   var inputCategory = req.params.category;
//   var query=`
//   SELECT  DISTINCT book.title, A.author_name, R.finalRating
//   FROM    book JOIN book_in_category BC ON book.isbn = BC.book_id 
//                JOIN category ON BC.category_id = category.category_id,
//           (SELECT  RR.book_id AS isbn, (0.3 * avg(RR.rating) + 0.7 * PR.pro_rating) AS finalRating
//           FROM    book JOIN reader_rating RR ON book.isbn = RR.book_id 
//                        JOIN pro_rating PR ON book.isbn = PR.book_id
//           GROUP BY RR.book_id) AS R,
//           (SELECT  AWB.book_id AS book_id, author.name AS author_name
//           FROM    author JOIN author_write_book AWB ON author.author_id = AWB.author_id) AS A
//   WHERE   category.category_id='${inputCategory}' AND book.isbn = R.isbn AND book.isbn = A.book_id
//   ORDER BY R.finalRating DESC
//   LIMIT   10;
//   `;
//   connection.query(query, function(err, rows, fields) {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({err:1});
//     }
//     else {
//       res.json(rows);
//     }
//   });
// };

function getTopBooksInCategory(req, res) {
  // try CREATE INDEX pro_rating_idx ON pro_rating(book_id, pro_rating, pro_rating_count);
  var inputCategory = req.params.category;
  var query=`
    WITH reader_avg AS (
        SELECT RR.book_id, AVG(rating) / 10 AS rating, COUNT(rating) AS rating_count
        FROM reader_rating RR JOIN book_in_category bic on RR.book_id = bic.book_id
        WHERE category_id = ?
        GROUP BY book_id
        HAVING rating_count >= 5
    )
    SELECT PR.book_id as isbn, b.title,  ((pro_rating / 500) * 0.7 + rating * 0.3) AS number
    FROM reader_avg RA
            JOIN pro_rating PR ON RA.book_id = PR.book_id
            JOIN book b on PR.book_id = b.isbn
            JOIN (SELECT * FROM book_in_category bic2 WHERE category_id = ?) c on b.isbn = c.book_id
    WHERE pro_rating_count >= 5
    ORDER BY number DESC
    LIMIT 10
  `;
  NQuery(query, [inputCategory, inputCategory]).then((data) => {
    res.json(data);
  }).catch( err => {
    console.log(err);
    res.status(400).json({err:1});
  });
};

/* ---- Advanced finder - constrained by budget - 8 books ---- */
// Find books the category with highest professional ratings, order by professional rating
function getRecommendByBudget(req, res) {
  var inputCategory = req.params.category;
  var inputBudget = req.params.budget;
  var query=`
    SELECT b.isbn, b.title, b.cover, avg(p.pro_rating) AS rating
    FROM book b
            JOIN book_in_category bc ON b.isbn = bc.book_id
            JOIN category c ON bc.category_id = c.category_id
            JOIN pro_rating p ON b.isbn = p.book_id
            JOIN book_market_price bmp ON b.isbn = bmp.book_id
    WHERE bmp.price < ?
      AND c.category_id = ?
    GROUP BY b.isbn
    ORDER BY rating DESC
    LIMIT 8;
  `;

  NQuery(query, [inputBudget, inputCategory]).then((data) => {
    res.json(data);
  }).catch( err => {
    console.log(err);
    res.status(400).json({err:1});
  })

  // var query=`
  // WITH possible_books AS( SELECT b.isbn, b.title, avg(p.pro_rating) AS rating
  //                         FROM book b JOIN book_in_category bc ON b.isbn = bc.book_id
  //                                     JOIN category c ON bc.category_id = c.category_id
  //                                     JOIN pro_rating p ON b.isbn = p.book_id
  //                                     JOIN book_market_price bmp ON b.isbn = bmp.book_id
  //                         WHERE bmp.price < ? AND c.name LIKE ?
  //                         GROUP BY b.isbn)
  // SELECT b.title, a.name
  // FROM possible_books b JOIN author_write_book awb ON b.isbn = awb.book_id JOIN author a ON a.author_id = awb.author_id
  // ORDER BY b.rating DESC
  // LIMIT 5;
  // `;
;
  // connection.query(query, [inputBudget, inputCategory], function(err, rows, fields) {
  //   if (err) console.log(err);
  //   else {
  //     res.json(rows);
  //   }
  // });
};


/* ---- Advanced finder - constrained by age ---- */
// Find books the category with most of reader ratings and order by reader rating counts
function getRecommendByAge(req, res) {
  var inputCategory = req.params.category;
  var lo = req.params.min;
  var hi = req.params.max;

  var query =`
  SELECT b.isbn, b.title, b.cover, COUNT(rr.rating) AS numRating
  FROM book b
          JOIN reader_rating rr ON rr.book_id = b.isbn
          JOIN reader r ON rr.reader_id = r.reader_id
          JOIN book_in_category bic ON b.isbn = bic.book_id
  WHERE r.age >= ?
    AND r.age < ?
    AND bic.category_id = ?
  GROUP BY b.isbn
  ORDER by COUNT(rr.rating) DESC
  LIMIT 8
  `;
  // var query=`
  // WITH commented_books AS ( SELECT b.isbn, b.title, COUNT(rr.rating) AS numRating
  //                           FROM book b JOIN reader_rating rr ON rr.book_id = b.isbn
  //                                       JOIN reader r ON rr.reader_id = r.reader_id
  //                                       JOIN book_in_category bic ON b.isbn = bic.book_id
  //                                       JOIN category c ON c.category_id = bic.category_id
  //                           WHERE r.age >= ? AND r.age < ? AND c.name LIKE ?
  //                           GROUP BY b.isbn
  //                           ORDER by COUNT(rr.rating) DESC
  //                           LIMIT 5)
  // SELECT  b.title, a.name
  // FROM    commented_books b JOIN author_write_book awb ON b.isbn = awb.book_id
  //                           JOIN author a ON a.author_id = awb.author_id
  // ORDER BY b.numRating DESC;
  // `;

  NQuery(query, [lo, hi, inputCategory]).then((data) => {
    res.json(data);
  }).catch( err => {
    console.log(err);
    res.status(400).json({err:1});
  })

  // connection.query(query, [lo, hi, inputCategory], function(err, rows, fields) {
  //   if (err) console.log(err);
  //   else {
  //     res.json(rows);
  //   }
  // });
};


/* ---- Random books page ---- */
function getRandomBooks(req, res) {
  var query = `
  SELECT b.isbn, b.title, b.cover, AVG (r.rating) as reader_rating
  FROM book b JOIN reader_rating r ON r.book_id=b.isbn
  GROUP BY b.isbn
  HAVING AVG(r.rating) > 4
  ORDER by RAND()
  LIMIT 12;
  `

  NQuery(query, [Math.random()]).then((data) => {
    res.json(data);
  }).catch( err => {
    console.log(err);
    res.status(400).json({err:1});
  })

  // connection.query(query, function(err, rows, fields) {
  //   if (err) console.log(err);
  //   else {
  //     data.payload = rows;
  //     res.json(data);
  //   }
  // });
};


/* ---- Recommended books page ---- */
function getRecommendBook(req, res) {
  let data = {ROI: [], CV: []}
  let query11 = `
    SELECT MAX(pro_rating) as MAX_PRO_RATING, MAX(pro_rating_count) AS MAX_PRO_RC, MAX(txt_review_count) AS MAX_PRO_TC
    FROM pro_rating;
  `
  let query12 = `
    WITH PRO_REVIEW_INDEX AS (
        SELECT PR.book_id,
              (
                  (PR.pro_rating / ?) * 0.2
                  + (PR.pro_rating_count / ?) * 0.3
                  + (PR.txt_review_count / ?) * 0.5
              ) * 100 AS pro_index
        FROM pro_rating PR
    )

    SELECT isbn, title, ( pro_index / price ) * 100 AS number 
    FROM book_market_price P
            Join PRO_REVIEW_INDEX PRI ON P.book_id = PRI.book_id
            JOIN book b on P.book_id = b.isbn
    ORDER BY number DESC
    LIMIT 10;
  `
  let query2 = `
    WITH reader_avg AS (
        SELECT book_id, AVG(rating) / 10 AS rating, COUNT(rating) AS rating_count
        FROM reader_rating
        GROUP BY book_id
        HAVING rating_count >= 5
    )
    SELECT PR.book_id as isbn, b.title, ABS(pro_rating / 500 - rating) AS number
    FROM reader_avg RA
        JOIN pro_rating PR ON RA.book_id=PR.book_id
        JOIN book b on PR.book_id = b.isbn
    WHERE pro_rating_count >= 5
    ORDER BY number DESC
    LIMIT 10;
  `

  // New Method
  NQuery(query11).then((v) => {
    Promise.all([
      NQuery(query12, [v[0].MAX_PRO_RATING, v[0].MAX_PRO_RC, v[0].MAX_PRO_TC]),
      NQuery(query2)
    ]).then((result) => {
      [data.ROI, data.CV] = result
      res.json(data);
    })
  }).catch(e => console.log(e));


  // old method
  // connection.query(query11, (err, maxVals) => {
  //   if (err) console.log(err);
  //   connection.query(query12, [maxVals[0].MAX_PRO_RATING, maxVals[0].MAX_PRO_RC, maxVals[0].MAX_PRO_TC], (err, r1) => {
  //     if (err) console.log(err);
  //     data.ROI = r1;
  //     connection.query(query2, (err, r2) => {
  //       data.CV = r2;
  //       res.json(data);
  //     })
  //   })
  // })

};


/* ---- Book info page ---- */
function getBookInfo(req, res) {
  var inputBook = req.params.isbn;
  let data = {status: 1} 

  var queryBasic = `
  WITH P AS (SELECT bmp.book_id, bmp.price FROM book_market_price bmp WHERE bmp.book_id = ?),
       PR AS (SELECT pr.book_id, pr.pro_rating FROM pro_rating pr WHERE pr.book_id = ?),
       RR AS (SELECT rr.book_id, AVG (rr.rating) AS reader_rating FROM reader_rating rr WHERE rr.book_id = ?),
       SR AS (SELECT bsr.book_id, bsr.book_seller_rank, bsr.website FROM book_seller_rank bsr WHERE bsr.book_id = ?),
       OI AS (SELECT b.isbn, b.title, b.cover, b.num_pages, b.publisher FROM book b WHERE b.isbn = ?)
  SELECT OI.title, OI.cover, P.price, PR.pro_rating, RR.reader_rating, SR.book_seller_rank, SR.website, OI.num_pages, OI.publisher
  FROM OI LEFT JOIN P ON OI.isbn = P.book_id LEFT JOIN PR ON OI.isbn = PR.book_id LEFT JOIN RR ON OI.isbn = RR.book_id LEFT JOIN SR ON OI.isbn = SR.book_id;
  `;

  var queryCategories = `
  SELECT  C.name, C.category_id
  FROM    category C JOIN book_in_category BC ON C.category_id = BC.category_id
  WHERE   BC.book_id = ?;
  `;

  var queryAuthors = `
  SELECT  A.name, A.author_id
  FROM    author A JOIN author_write_book AWB ON A.author_id = AWB.author_id
  WHERE   AWB.book_id = ?;
  `;

  Promise.all([
    NQuery(queryBasic, Array(5).fill(inputBook)),
    NQuery(queryCategories, [inputBook]),
    NQuery(queryAuthors, [inputBook])
  ]).then((result) => {
    if (result[0].length > 0) {
      data = {...data,...result[0][0]};
      data['category'] = result[1];
      data['author'] = result[2];
      res.json(data)
    } else {
      return res.status(400).json({status: 0});
    }
  })

  // connection.query(queryBasic, Array(5).fill(inputBook), function(err, result0) {
  //   if (err) console.log(err);
  //   else {
  //     if (result0.length === 0) {
  //       return res.status(404).json({status: 0});
  //     }
  //     data = {...data,...result0[0]};
  //     connection.query(queryCategories, [inputBook], (err, result1) => {
  //       if (err) console.log(err);
  //       else {
  //         data['category'] = result1;
  //         connection.query(queryAuthors, [inputBook], (err, result2) => {
  //           if (err) console.log(err);
  //           else {
  //             data['author'] = result2;
  //             res.json(data);
  //           }
  //         })
  //       }
  //     })
  //   }
  // });
};

/* ---- Book info page ---- */
// -----------------------------------------
// !!! OPTIMIZATION_CASE: related_book
// -----------------------------------------
function getRelatedBooks(req, res) {
  var inputBook = req.params.isbn;

  // Old query
  // var query = `
  //   WITH reader_count AS (  SELECT  RR.book_id, (COUNT(RR.reader_id)) as review_count
  //                           FROM    reader_rating RR
  //                           GROUP BY RR.book_id),
  //   possible_books AS (
  //       SELECT *
  //       FROM    book_in_category BC
  //           JOIN book b on BC.book_id = b.isbn
  //       WHERE BC.category_id IN (SELECT bic.category_id FROM book_in_category bic WHERE bic.book_id = "9780553296983")
  //   )
  //   SELECT  PB.isbn, PB.cover, PB.title
  //   FROM    pro_rating PR
  //       JOIN possible_books PB ON PR.book_id = PB.isbn
  //       JOIN reader_count RC ON RC.book_id = PB.book_id
  //   WHERE   PB.isbn <> 9780553296983
  //   ORDER BY (RC.review_count * 0.2 + PR.pro_rating_count * 0.3 + PR.txt_review_count * 0.5)  DESC
  //   LIMIT 5;
  // `;

  var query = `
    WITH possible_books AS (
      SELECT distinct BC.book_id
      FROM book_in_category BC
              JOIN (
                  SELECT category_id
                  FROM book_in_category bic
                  WHERE bic.book_id = ?
              ) CT ON CT.category_id=BC.category_id
          WHERE BC.book_id <> ?
      ),
    reader_counts AS (
        SELECT PB.book_id, COUNT(reader_id) AS reader_count
        FROM reader_rating RR
            JOIN possible_books PB ON PB.book_id=RR.book_id
        GROUP BY PB.book_id
    )
    SELECT b.isbn, b.cover, b.title
    FROM pro_rating PR
        JOIN reader_counts RC on PR.book_id = RC.book_id
        JOIN book b on b.isbn = PR.book_id
    ORDER BY (RC.reader_count * 0.2 + PR.pro_rating_count * 0.3 + PR.txt_review_count * 0.5) DESC
    LIMIT 5;
  `

  NQuery(query, [inputBook, inputBook]).then((data) => {
    res.json(data);
  }).catch( err => {
    console.log(err);
    res.status(400).json({err:1});
  });


}

// The exported functions, which can be accessed in index.js.
module.exports = {
  getAllCategories: getAllCategories,
  getAllBooksForCategory: getAllBooksForCategory,
  getAllAuthors: getAllAuthors,
  getAllBooksForAuthor: getAllBooksForAuthor,
  searchAuthor: searchAuthor,
  searchBook: searchBook,
  getTopBooksInCategory: getTopBooksInCategory,
  getRecommendByBudget: getRecommendByBudget,
  getRecommendByAge: getRecommendByAge,
  getRandomBooks: getRandomBooks,
  getBookInfo: getBookInfo,
  getRecommendBook: getRecommendBook,
  getRelatedBooks: getRelatedBooks

}