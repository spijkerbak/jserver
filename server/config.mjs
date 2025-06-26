import fs from 'fs'

const config = {
    build: "2025.06.10.1",

    port: {
        http: 80, // set to 0 if no redirection needed
        https: 443,
    },

    ssl: {
        key: fs.readFileSync('ssl/key.pem'),
        cert: fs.readFileSync('ssl/cert.pem')
    },

    webroot: 'D:/Users/Tester/Documents/ontw/webroot',

    // folders outside webroot subfolders
    special_folders: {
        'common' : 'D:/Users/Tester/Documents/ontw/webroot/common',
        'script' : 'D:/Users/Tester/Documents/ontw/webroot/script',
        'img': 'D:/Users/Tester/Pictures',
        'pictures': 'D:/Users/Tester/Pictures',
        'videos': 'D:/Users/Tester/Videos',
        'export': 'C:/export'
    },

    api_folders: {
        'api': 'D:/Users/Tester/Documents/ontw/webroot/api',
    },

    /* hostnames that need to be redirected to another hostname */
    redirect_hosts: {
        '127.0.0.1': 'sissy',
        'localhost': 'sissy',
        'sissy.local': 'sissy',
    },

    /* hosts and their corresponding folders in the webroot */
    known_hosts: {
        'penny': 'sissy',
        'sissy': 'sissy',
    }
}

export { config }
