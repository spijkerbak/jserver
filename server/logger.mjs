


function getISODateTimeString() {
    let dt = new Date()
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset())
    const t = dt.toISOString()
    return t.substring(0, 10) + " " + t.substring(11, 22)
}

class Logger {
    #colors = {
        'FATAL': 'color: purple;',
        'ERROR': 'color: red;',
        'ALERT': 'color: brown;',
        'INFO': '',
        'DEBUG': 'color: green;',
        'TRACE': 'color: yellow;',

    }

    #levels = {
        'TRACE': 1,
        'DEBUG': 2,
        'INFO': 3,
        'ALERT': 4,
        'ERROR': 5,
        'FATAL': 6,
    }

    #log_level = this.#levels['DEBUG']
    
    #write(level, msg) {
        // level must be #log_level or higher
        if (this.#levels[level] >= this.#log_level) {
            let stamp = getISODateTimeString()
            console.log("%c%s %s: %s", this.#colors[level], stamp, level, msg)
        }
    }
    setLevel(level) {
        this.#log_level = this.#levels[level]
    }

    trace(text) { this.#write('TRACE', text) }
    debug(text) { this.#write('DEBUG', text) }
    info(text) { this.#write('INFO', text) }
    alert(text) { this.#write('ALERT', text) }
    error(text) { this.#write('ERROR', text) }
    fatal(text) { this.#write('FATAL', text) }
}

const logger = new Logger()

export default logger 

