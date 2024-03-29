require('dotenv').config();
const { CONNECTION_STRING } = process.env;

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(CONNECTION_STRING);

module.exports = {
    getPreprints: (req, res) => {
        const { license, date, title, category, author, institution, limit } = req.query;
        let query = `SELECT * FROM preprints WHERE 1=1`;
        
        if (license) query += ` AND license LIKE '%${license}%'`;
        if (date) query += ` AND date = '${date}'`;
        if (title) query += ` AND title LIKE '%${title}%'`;
        if (category) query += ` AND category LIKE '%${category}%'`;
        if (author) query += ` AND authors LIKE '%${author}%'`;
        if (institution) query += ` AND author_corresponding_institution LIKE '%${institution}%'`;

        query += `${limit ? ` LIMIT ${limit}` : ` LIMIT 10`}`;

        sequelize.query(query)
        .then(([results, metadata]) => {
            res.status(200).send(results);
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Error getting preprints');
        });
    },
    getPreprintsGroupByLicense: (req, res) => {
        sequelize.query(`
            SELECT license, COUNT(*) as count
            FROM preprints
            GROUP BY license
        `)
        .then(([results, metadata]) => {
            console.log(results)

            const countsByLicense = results.reduce((obj, row) => {
                obj[row.license] = row.count;
                return obj;
            }, {});

            res.status(200).send(countsByLicense);
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Error getting preprints grouped by license');
        });
    },
    getPreprintsGroupByCategory: (req, res) => {
        sequelize.query(`
            SELECT category, COUNT(*) as count
            FROM preprints
            GROUP BY category
        `)
        .then(([results, metadata]) => {
            console.log(results)
    
            const countsByCategory = results.reduce((obj, row) => {
                obj[row.category] = row.count;
                return obj;
            }, {});
            console.log(countsByCategory)

            const normalizeAndCombine = (obj) => {
                const misspellingsMap = {
                  'animal behavior and cognition': 'animal behavior and cognition',
                  'animal behavior and cognition ': 'animal behavior and cognition',
                  'biochemistry ': 'biochemistry',
                  'bioengineering ': 'bioengineering',
                  'bioinformatics': 'bioinformatics',
                  'bioinformatics ': 'bioinformatics',
                  'biophysics ': 'biophysics',
                  'cancer biology ': 'cancer biology',
                  'cell biology ': 'cell biology',
                  'clinical trials ': 'clinical trials',
                  'developmental biology ': 'developmental biology',
                  'ecology': 'ecology',
                  'ecology ': 'ecology',
                  'epidemiology ': 'epidemiology',
                  'evolutionary biology': 'evolutionary biology',
                  'evolutionary biology ': 'evolutionary biology',
                  'genetics ': 'genetics',
                  'genomics ': 'genomics',
                  'immunology ': 'immunology',
                  'microbiology ': 'microbiology',
                  'molecular biology ': 'molecular biology',
                  'neuroscience ': 'neuroscience',
                  'paleontology ': 'paleontology',
                  'pathology ': 'pathology',
                  'pharmacology and toxicology ': 'pharmacology and toxicology',
                  'physiology ': 'physiology',
                  'plant biology ': 'plant biology',
                  'scientific communication and education': 'scientific communication and education',
                  'synthetic biology ': 'synthetic biology',
                  'systems biology ': 'systems biology',
                  'zoology ': 'zoology',
                };

                const normalizedObject = Object.entries(obj).reduce((acc, [key, value]) => {
                    const normalizedKey = normalizeCategoryName(key, misspellingsMap);
                    if (acc[normalizedKey]) {
                      acc[normalizedKey] = parseInt(acc[normalizedKey]) + parseInt(value);
                    } else {
                      acc[normalizedKey] = value;
                    }
                    return acc;
                  }, {});
                
                  return normalizedObject;
                };

                const normalizeCategoryName = (category, misspellingsMap) => {
                    const normalizedCategory = category.trim().toLowerCase();
                    return misspellingsMap[normalizedCategory] || normalizedCategory;
                  };
                  
                  const normalizedCountsByCategory = normalizeAndCombine(countsByCategory);

                  console.log(normalizedCountsByCategory)

            res.status(200).send(normalizedCountsByCategory);
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Error getting preprints grouped by category');
        });
    },
    getPreprintsGroupByYear: (req, res) => {
        sequelize.query(`
            SELECT EXTRACT(YEAR FROM date) AS year, COUNT(*) as count
            FROM preprints
            GROUP BY EXTRACT(YEAR FROM date);
        `)
        .then(([results, metadata]) => {
            console.log(results)

            const countsByYear = results.reduce((obj, row) => {
                obj[row.year] = row.count;
                return obj;
            }, {});

            res.status(200).send(countsByYear);
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Error getting preprints grouped by year');
        });
    },
    getPreprintsGroupByMonth: (req, res) => {
        sequelize.query(`
            SELECT EXTRACT(MONTH FROM date) AS month, COUNT(*) as count
            FROM preprints
            GROUP BY EXTRACT(MONTH FROM date);
        `)
        .then(([results, metadata]) => {
            console.log(results)

            const countsByMonth = results.reduce((obj, row) => {
                obj[row.month] = row.count;
                return obj;
            }, {});

            res.status(200).send(countsByMonth);
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Error getting preprints grouped by month');
        });
    },
    createTable: (req, res) => {
        sequelize.query(`
        DROP TABLE IF EXISTS preprints;

        CREATE TABLE preprints (
            id SERIAL PRIMARY KEY,
            doi VARCHAR(255),
            title VARCHAR(255),
            authors VARCHAR(255),
            author_corresponding VARCHAR(255),
            author_corresponding_institution VARCHAR(255),
            date DATE,
            version INTEGER,
            type VARCHAR(255),
            license VARCHAR(255),
            category VARCHAR(255),
            jatsxml TEXT,
            abstract TEXT,
            published VARCHAR(255),
            server VARCHAR(255)
        );
        `)
        .then(dbRes => console.log(dbRes[0]))
        .catch(err => console.log(err))
    },
    insertIntoTable: (doi, title, authors, author_corresponding, author_corresponding_institution, date, version, type, license, category, jatsxml, abstract, published, server) => {
        return new Promise((resolve, reject) => {
            sequelize.query(`
                INSERT INTO preprints (
                    doi, 
                    title, 
                    authors, 
                    author_corresponding, 
                    author_corresponding_institution, 
                    date, 
                    version, 
                    type, 
                    license, 
                    category, 
                    jatsxml, 
                    abstract, 
                    published, 
                    server
                ) 
                VALUES (
                    '${doi}', 
                    '${title}', 
                    '${authors}', 
                    '${author_corresponding}', 
                    '${author_corresponding_institution}', 
                    '${date}', 
                    '${version}', 
                    '${type}', 
                    '${license}', 
                    '${category}', 
                    '${jatsxml}', 
                    '${abstract}', 
                    '${published}', 
                    '${server}'
                )
            `)
            .then(dbRes => {
                console.log(dbRes[0]);
                resolve();
            })
            .catch(err => {
                console.log(err);
                reject(err);
            })
        });
    }
}