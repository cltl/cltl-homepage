# CLTL Homepage


My personal homepage

Create a python environment

`$python -m venv venv`

Activate it

`$source venv/bin/activate`

Install Flask and other main dependencies:

`$pip install -U flask flask-cors requests pybtex `

Install bibtexparser (directly from git)

`$pip install --no-cache-dir --force-reinstall git+https://github.com/sciunto-org/python-bibtexparser@main`

Run the app locally:

`$python __init__.py`

You should now be able to see the log on your terminal and access the page on your localhost:

http://127.0.0.1:5000