from homepage import app
from create_db import setup

if __name__ == '__main__':
    setup()
    app.run(debug=True, host='0.0.0.0', threaded=True)
