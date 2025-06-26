import fs from 'fs'

const webroot = 'B:/Frans/Documents/ontw/webroot'

const config =
{
    build: "2025.06.10.1",

    port: {
        http: 80, // set to 0 if no redirection needed
        https: 443,
    },

    ssl: {
        key: fs.readFileSync('ssl/key.pem'),
        cert: fs.readFileSync('ssl/cert.pem')
    },

    webroot: webroot,

    // folders outside webroot subfolders
    special_folders: {
        'common': webroot + '/common', 
        'script': webroot + '/script', 
        'site-js': webroot + '/site-js', 
    },


    api_folders: {
        'api': webroot + '/api',
    },

    /* hostnames that need to be redirected to another hostname */
    redirect_hosts: {
        // '127.0.0.1': 'sonny',
        // 'localhost': 'sonny',
        // 'berry.local': 'berry',
    },

    /* hosts and their corresponding folders in the webroot */
    known_hosts: {
        'sissy': 'systems',
        'berry': 'berry',
        'localhost': 'localhost',
        'nb210986': 'nb210986',
        'sonny': 'systems',
    }
}

export { config }
