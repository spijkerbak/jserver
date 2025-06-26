import { config } from './config.mjs'
import logger from './logger.mjs'
import WebServer from './webserver.mjs'

logger.info("starting server, build " + config.build)

// Create one webserver for all subdomains
new WebServer()
