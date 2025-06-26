import http from 'http'
import { config } from './config.mjs'
import logger from './logger.mjs'

//=============================================================================
// Create HTTP server for redirection only
//=============================================================================

const port = config.port.http

http.createServer((req, res) => {
    logger.info("REDIRECT HTTP TO HTTPS")
    res.writeHead(301,  // 301 Moved Permanently
        {
            'Location': 'https://' + req.headers.host + req.url,
            // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        })
    res.end("")
}).listen(port, () => {
    logger.info('http server listening on port ' + port)
}).on('error', (event) => {
    logger.error('Cannot listen on port ' + port)
    logger.error(event)
})