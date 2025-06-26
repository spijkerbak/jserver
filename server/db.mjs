import mysql from "mysql"

import logger from './logger.mjs'

const dbconf = {
    host: "127.0.0.1", // force ipv4
    user: "the_manager",
    password: "Manager-4-Manager",
    database: 'general'
}

// mysql types to readable text
let types = []
types[3] = 'int'
types[253] = 'string'

// Connect to database
let db = mysql.createConnection(dbconf)

db.tables = {
  // "users": {
  //   id: {
  //     name: "id",
  //     type: "int",
  //     length: 11
  //   }
  // }
}

db.connect(function (err) {
  if (err) {
    logger.info("error connecting to database")
    logger.info(err)
  } else {
    logger.info("connected to database")
  }
})

db.extractFieldsInfo = fields => {
  let info = []
  for (let field of fields) {
    let h = extractFieldInfo(field)
    info.push(h)
  }
  return info
}

function getFields(table) {
  db.query({
    sql: "SELECT * FROM " + table + " WHERE 0 = 1",
    values: []
  }, (err, result, fields) => {
    if (err) {
      throw err
    }
    db.tables[table] = {}
    for (let field of fields) {
      db.tables[table][field.name] = extractFieldInfo(field)
    }
  })
}

function extractFieldInfo(field) {
  return {
    name: field.name,
    type: types[field.type] ?? field.type,
    length: field.length
  }
}

db.compress = list => {
  let result = []
  for (let row of list) {
    result.push(Object.values(row))
  }
  return result
}

getFields("`project_manager`.`users`")

export default db

