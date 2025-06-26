import https from 'https'
import fs from 'fs'
import path from 'path'

import { config } from './config.mjs'
import logger from './logger.mjs'
//import './redirector.mjs'

let fileCache = {}

const mimes = {
    '.txt': { contentType: 'text/plain', encoding: 'utf-8' },
    '.html': { contentType: 'text/html', encoding: 'utf-8' },
    '.css': { contentType: 'text/css', encoding: 'utf-8' },
    '.js': { contentType: 'text/javascript', encoding: 'utf-8' },
    '.mjs': { contentType: 'text/javascript', encoding: 'utf-8' },
    '.png': { contentType: 'image/png', encoding: '' },
    '.jpg': { contentType: 'image/jpeg', encoding: '' },
    '.jpeg': { contentType: 'image/jpeg', encoding: '' },
    '.mp4': { contentType: 'video/mp4', encoding: '' },
    '.wmv': { contentType: 'video/x-ms-asf', encoding: '' },
}

function makeResponseHeader(filepath) {
    const ext = path.extname(filepath)
    const mime = mimes[ext] ?? mimes['.txt']
    return {
        'Content-type': mime.contentType,
        'Referrer-Policy': 'no-referrer',
        'X-Frame-Options': 'SAMEORIGIN',
        // 'X-Content-Type-Options': 'nosniff',
    }
}

class WebServer {

    #sendFile(filepath, res) {
        if (filepath in fileCache) {
            logger.debug('FROM CACHE: ' + filepath)
            let header = fileCache[filepath].header
            res.writeHead(200, header)
            res.end(fileCache[filepath].data)
            return
        }

        fs.lstat(filepath, (err, stats) => {
            if (err) {
                return this.#errorResponse(res, 404, 'File not found (30)')
            }

            let xfilepath = stats.isDirectory() ? path.join(filepath, 'index.html') : filepath

            fs.readFile(xfilepath, (err, data) => {
                logger.debug('SEND FILE: ' + xfilepath)
                if (err) {
                    return this.#errorResponse(res, 404, 'File not found (40)')
                }
                const header = makeResponseHeader(xfilepath)
                //fileCache[filepath] = { header: header, data: data }
                res.writeHead(200, header)
                res.end(data)
            })
        })
    }

    #streamFile(filepath, res) {
        fs.lstat(filepath, (err, stats) => {
            if (err) {
                return this.#errorResponse(res, 404, 'File not found (30)')
            }
            const xfilepath = stats.isDirectory() ? path.join(filepath, 'index.html') : filepath
            if (!res.req.headers.range) {
                // No range header, send entire file
                console.log("NO RANGE!")
                const header = {
                    ...makeResponseHeader(xfilepath),
                    'Content-Length': stats.size,
                    'Accept-Ranges': 'bytes'
                }
                res.writeHead(200, header)
                fs.createReadStream(xfilepath).pipe(res)
                return
            }

            // console.log("STREAM WITH RANGE:" + res.req.headers.range)

            // Parse Range header
            const parts = res.req.headers.range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1

            if (start >= stats.size || end >= stats.size) {
                res.writeHead(416, {
                    'Content-Range': `bytes */${stats.size}`
                })
                res.end()
                return
            }
            const chunkSize = (end - start) + 1
            const header = {
                ...makeResponseHeader(xfilepath),
                'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize
            }
            res.writeHead(206, header)
            fs.createReadStream(xfilepath, { start, end }).pipe(res)
        })
    }


    /**
     * translate request to a more useful object
     * scheme:[//host]path[?query][#fragment]
     * Note: fragment, everything after hash, is not sent to the server!
     * 
     * rules:
     * - remove index.html
     * - remove double slashes
     * - add slash when not ending on name+extension, except for api paths
     */
    #xlatRequest(req) {

        let url = decodeURIComponent(req.url).replace(/\/\/+/, '/')

        let xreq = {
            method: req.method,
            scheme: req.connection.encrypted ? 'https' : 'http',
            host: req.headers.host,
            port: req.connection.localPort,
            url: url,
            path: url,
            api: false,
            contentType: req.headers['content-type'],
        }

        if (url.includes('?')) {
            let parts = url.split('?')
            xreq.path = parts[0]
            xreq.queryString = parts[1]
            xreq.queryParams = Object.fromEntries(new URLSearchParams(xreq.queryString))
        } else {
            xreq.queryString = ''
            xreq.queryParams = {}
        }

        let redirect = false
        if (xreq.path.includes('//')) {
            xreq.path = xreq.path.replace(/\/\/+/g, '/')
            redirect = true
        }
        if (xreq.path.endsWith('index.html')) {
            xreq.path = xreq.path.slice(0, -10)
            redirect = true
        }

        // add slash when path does not end with a filename+extension
        // but leave api-paths alone
        if (xreq.path != '/' && !xreq.path.endsWith('/')) {
            let part1 = xreq.path.split('/')[1]
            if (!config.api_folders[part1]) {
                let slashPos = xreq.path.lastIndexOf('/')
                let dotPos = xreq.path.lastIndexOf('.')
                if (dotPos < slashPos) {
                    xreq.path += '/'
                    redirect = true
                }
            }
        }

        if (redirect) {
            xreq.redirect = xreq.scheme + '://' + xreq.host + xreq.path
            if (xreq.queryString) {
                xreq.redirect += '?' + xreq.queryString
            }
        }

        xreq.parts = xreq.path.split('/')
        if (xreq.parts[xreq.parts.length - 1] == '') {
            xreq.parts.pop()
        }
        xreq.parts.shift()

        if (xreq.parts.length > 0 && xreq.parts[0] in config.api_folders) {
            xreq.api = true
        }

        return xreq
    }

    #errorResponse(res, status, message) {
        logger.error('ERROR: ' + status + ' ' + message)
        res.writeHead(status, { 'Content-Type': 'application/json', })
        res.end(JSON.stringify({ status: status, message: message }))
        return false
    }

    /**
     * Redirect to a different location
     * @param {*} res
     * @param {*} status, 301 (Moved Permamently) or 302 (Moved Temporarily)
     * @param {*} location
     */
    #redirectResponse(res, status, location) {
        logger.info('REDIRECT: ' + status + ' ' + location)
        res.writeHead(status, { 'Location': location })
        res.end()
        return false
    }

    #runAPIModule(xreq, res, data) {
        let base = xreq.parts[0]
        let endpoint = xreq.parts[1]
        const apiFilePath = 'file://' + path.join(config.webroot, base + '/' + endpoint + '.mjs')
        import(apiFilePath)
            .then(module => {
                if (data) {
                    if (xreq.contentType == 'application/json') {
                        data = JSON.parse(data)
                    } else if (xreq.contentType == 'application/x-www-form-urlencoded') {
                        data = Object.fromEntries(new URLSearchParams(data))
                    } else {
                        return this.#errorResponse(res, 400, { message: 'unsupported content type: ' + xreq.contentType })
                    }
                    console.log(xreq.method + ' DATA:')
                    console.log(data)

                } else {
                    data = {}
                }
                module.run(xreq, res, config, data)
                return
            })
            .catch(err => {
                return this.#errorResponse(res, 500, 'API error: ' + err.message)
            })

    }

    #handleRequest(xreq, res) {

        if (xreq.host in config.redirect_hosts) {
            let host = config.redirect_hosts[xreq.host]
            logger.info('redirecting to ' + host)
            return this.#redirectResponse(res, 301, 'https://' + host + xreq.url + (xreq.queryString ? '?' + xreq.queryString : ''))
        }

        if (!(xreq.host in config.known_hosts)) {
            return this.#errorResponse(res, 404, 'unknown host: ' + xreq.host)
        }

        let base = xreq.parts[0]
        let requested_path = ''

        if (base in config.special_folders) {
            requested_path = path.join(config.special_folders[base], xreq.path.replace(base + '/', ''))
        } else {
            requested_path = path.join(config.webroot, config.known_hosts[xreq.host], xreq.path)
        }
        fs.realpath(requested_path, (err, resolvedPath) => {
            if (err) {
                logger.error('File not found: ' + requested_path)
                res.writeHead(404, { 'Content-Type': 'text/plain', })
                res.write('host: ' + xreq.host + '\n')
                res.write('requested path: ' + requested_path + '\n')
                res.write('resolved path: ' + resolvedPath + '\n')
                res.end('File not found (20)')
                return
            }
            if (xreq.method == 'HEAD') {
                res.writeHead(200, makeResponseHeader(resolvedPath))
                res.end()
                return
            }
            fs.stat(resolvedPath, (err, stats) => {
                if (!err && stats.size > 1024 * 1024) { // filesize > 1MB
                    this.#streamFile(resolvedPath, res)
                } else {
                    this.#sendFile(resolvedPath, res)
                }
            })
        })
        return
    }

    constructor() {

        let port = config.port.https
        let ssl = config.ssl

        https.createServer(ssl, (req, res) => {
            let xreq = this.#xlatRequest(req)
            logger.debug('REQUEST: ' + xreq.url)

            if (xreq.redirect) {
                return this.#redirectResponse(res, 301, xreq.redirect)
            }

            if (xreq.api) {
                logger.debug(xreq.method + ': ' + xreq.path)
                let body = ''
                req.on('data', chunk => {
                    body += chunk
                }).on('end', () => {
                    return this.#runAPIModule(xreq, res, body)
                })
                return
            }

            switch (xreq.method) {
                case "HEAD":
                case "GET":
                case "POST":
                    return this.#handleRequest(xreq, res)
            }
            return this.#errorResponse(res, 405, 'method not allowed: ' + xreq.method)

        }).listen(port, () => {
            logger.info('https server listening on port ' + port)
        })

    }
}

export default WebServer
