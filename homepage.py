# -*- coding: utf-8 -*-

import sys, os, logging
import requests
from flask import Flask, request, session, g, redirect, url_for, \
    abort, render_template, flash, send_from_directory

import pybtex.database.input.bibtex
import pybtex.plugin
from flask_cors import CORS  # added this
import bibtexparser

from collections import defaultdict as dd

logging.basicConfig(stream=sys.stderr)

app = Flask(__name__)
app.config.from_object(__name__)
CORS(app)  # added this


APP_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_STATIC = os.path.join(APP_ROOT, 'static')

app.config['STATIC_FOLDER'] = APP_STATIC


@app.route('/')
def home():
    return render_template('welcome.html')

@app.route('/robots.txt')
def static_from_root():
    return send_from_directory(app.config['STATIC_FOLDER'], request.path[1:])

@app.route('/people')
def people():
    return render_template('people.html')

@app.route('/people/sophie-arnoult')
def people_sophie_arnoult():
    return render_template('people-sophie-arnoult.html')

@app.route('/research-overview')
def research_overview():
    return render_template('research-overview.html')

@app.route('/research-projs-current')
def projs_current():
    return render_template('research-projs-current.html')

@app.route('/research-projs-completed')
def projs_completed():
    return render_template('research-projs-completed.html')

@app.route('/research-partnerships')
def research_partnerships():
    return render_template('research-partnerships.html')

@app.route('/education-overview')
def education_overview():
    return render_template('education-overview.html')

@app.route('/education-ma-hlt')
def education_ma_hlt():
    return render_template('education-ma-hlt.html')

@app.route('/education-ma-tm')
def education_ma_tm():
    return render_template('education-ma-tm.html')

@app.route('/education-other-courses')
def education_other_courses():
    return render_template('education-other-courses.html')

@app.route('/education-internships')
def education_internships():
    return render_template('education-internships.html')

@app.route('/education-theses')
def education_theses():
    return render_template('education-theses.html')

@app.route('/news-current')
def news_current():
    return render_template('news-current.html')

@app.route('/news-archived')
def news_archived():
    return render_template('news-archived.html')

@app.route('/publication-reqs')
def publication_requirements():
    return render_template('publication-reqs.html')

@app.route('/resources')
def resources():
    return render_template('resources.html')


@app.route('/publications2')
def publications2():

    # THE SERVER DOES NOT ALLOW US TO DOWNLOAD ANYTHING FROM GITHUB!!!!!!!
    # url = "https://raw.githubusercontent.com/cltl/bibliography/master/cltl.bib"
    # response = requests.get(url)
    # bibtex_str = response.content

    # with  open(os.path.join(app.config['STATIC_FOLDER'], 'mybib.bib'), 'rb') as f:
    #     bibtex_str = f.read()

    # Install v2.0 from GIT: https://bibtexparser.readthedocs.io/en/main/install.html
    # library = bibtexparser.parse_string(bibtex_str)  # or bibtexparser.parse_file("my_file.bib")

    library = bibtexparser.parse_file(os.path.join(app.config['STATIC_FOLDER'], 'mybib.bib'))

    # print(f"Parsed {len(library.blocks)} blocks, including:"
    #       f"\n\t{len(library.entries)} entries"
    #       f"\n\t{len(library.comments)} comments"
    #       f"\n\t{len(library.strings)} strings and"
    #       f"\n\t{len(library.preambles)} preambles")

    # Entries have more attributes
    first_entry = library.entries[0]
    first_entry.key  # The entry key
    first_entry.entry_type  # The entry type, e.g. "article"
    first_entry.fields  # The entry fields (e.g. author, title, etc. with their values)
    first_entry.fields_dict  # The entry fields, as a dictionary by field key

    # Each field of the entry is a `bibtexparser.model.Field` instance
    first_field = first_entry.fields[0]
    first_field.key  # The field key, e.g. "author"
    first_field.value  # The field value, e.g. "Albert Einstein and Boris Johnson"


    publications = ""
    for entry in library.entries:
        publications += str(entry.fields_dict) + "<br><br><br><br>\n\n"

        for dictkey in entry.fields_dict.keys():
            if "author" in dictkey:
                print(entry.fields_dict[dictkey])
        # print(entry.fields_dict.keys())
        # print(entry.fields_dict["year"])


    # print(first_entry.key, first_entry.entry_type, first_entry.fields, first_entry.fields_dict, first_field.key, first_field.value)

    return publications
@app.route('/publications')
def publications():

    pubs = dd(list)
    publications = ''

    url = "https://raw.githubusercontent.com/cltl/bibliography/master/cltl.bib"
    response = requests.get(url)
    print(type(response.content))


    filename = os.path.join(APP_STATIC, 'mybib.bib')
    style = pybtex.plugin.find_plugin('pybtex.style.formatting', 'plain')()
    backend = pybtex.plugin.find_plugin('pybtex.backends', 'html')()
    parser = pybtex.database.input.bibtex.Parser()


    with  open(os.path.join(app.config['STATIC_FOLDER'], 'mybib.bib'), 'rb') as f:
        contents = f.read().decode("UTF-8")
        data = parser.parse_string(contents)


    # contents = response.content.decode("UTF-8")
    # print(type(contents))
    #
    # data = parser.parse_string(contents)

    for e in data.entries:

        authors = ''
        for author in data.entries[e].persons:
            for person in data.entries[e].persons[author]:
                authors += str(person) + ' and '

        authors = authors[:-4]

        year = data.entries[e].fields['year']

        title = data.entries[e].fields['title'].replace('{', '').replace('}', '')

        booktitle = data.entries[e].fields['booktitle'].replace('{', '').replace('}', '')

        address = data.entries[e].fields['address']

        pages = data.entries[e].fields['pages'] if 'pages' in data.entries[e].fields else None

        url = data.entries[e].fields['url'] if 'url' in data.entries[e].fields else None

        publisher = data.entries[e].fields['publisher'] if 'publisher' in data.entries[e].fields else None

        note = data.entries[e].fields['note'] if 'note' in data.entries[e].fields else None


        pub = """<b>{} ({}).</b> {}. <i>{}</i>. {} {}. {} {}""".format(
            authors,
            year,
            title,
            booktitle,
            publisher+'.' if publisher else '',
            address,
            note if note else '',
            """<span class="small"><a target="_blank" href='"""+url+"""'>[pdf]</a></span>""" if url else '')

        
        pubs[year].append(pub)


    for year in reversed(sorted(pubs)):

        # publications += "<br><h4>{}</h4>".format(year)

        for p in pubs[year]:
            publications += "<p>{}</p>".format(p)

            
    return render_template('publications.html', publications = publications)
