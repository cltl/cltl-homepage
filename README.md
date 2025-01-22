# CLTL Homepage

## Deploying the website locally

Create a python environment

`$python -m venv venv`

Activate it

`$source venv/bin/activate`

Install Flask and other main dependencies:

`$pip install -U flask flask-cors requests pybtex `

Install bibtexparser (directly from git)

`$pip install --no-cache-dir --force-reinstall git+https://github.com/sciunto-org/python-bibtexparser@main`

To update the database:
`$ pip install pandas openpyxl`

Run the app locally:

`$python __init__.py`

You should now be able to see the log on your terminal and access the page on your localhost:

http://127.0.0.1:5000

## Updating Theses list
The theses overview is located at `static/data/theses_inventory.xlsx`, and theses at `static/data/theses`.
For the website, theses data (author, year, title, filename) are read from a database created at `static/data/theses.db`, and theses pdfs are loaded from `static/data/theses`. 
Call `create-db.py` to refresh the database with new theses:
```
python create-db.py
```
The script will also check if filenames are formatted correctly.

## Contributing to the website
See [CONTRIBUTING.md](CONTRIBUTING.md) for general guidelines, and below for pull-request instructions.

## Making a pull request
#### Setup 
1. [Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) this repository (https://github.com/cltl/cltl-homepage). This will create a `cltl-homepage` repository (so-called *fork*) under your account.
2. [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) your fork to work locally.
```
$ git clone git@github.com:<YOUR_USERNAME>/cltl-homepage.git
```
3. Add `cltl/cltl-homepage` as a remote repository to allow updates from `cltl/cltl-homepage` to your local copy
```
$ cd cltl-homepage
cltl-homepage$ git remote add upstream git@github.com:cltl/cltl-homepage.git
```

#### Preparing for commits
1. Your local copy initially has a single branch, called `main`. Whenever you plan to make a commit, you should first make sure that your `main` branch incorporates changes to `cltl/cltl-homepage`:
```
cltl-homepage$ git pull upstream main
```
Update your fork's content by pushing the local changes
```
cltl-homepage$ git push -u origin main
```


#### Making commits 
1. Always make changes in a separate [branch](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches), to prevent [merge conflicts](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts) in your main branch. Create a new branch with a descriptive name, e.g. `update-current-news-page`:
```
$ git checkout -b new-feature
```
Your repository should now have two branches. You can check this by typing `git branch`:
```
cltl-homepage$ git branch
  main
* update-current-news-page
```
The asterisk marks the active branch

2. You can now work and modify files in the repository. 
3. [Deploy the website locally](#deploying-the-website-locally) to test and verify your changes 
4. Stage and commit your changes, then push them to your repository:
```
cltl-homepage$ git add --all
cltl-homepage$ git commit -m "update current news page"
cltl-homepage$ git push -u origin update-current-news-page 
```
This will create a branch `update-current-news-page` in your fork. You can make a pull request from there

#### Making a pull request
The goal of the pull request is to have the content of the branch `update-current-news-page` in your fork *pulled* into the `cltl/cltl-homepage` repository.

Follow [these instructions](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) to make the pull request, where `head repository` points your fork, and `base repository` points to `cltl/cltl-homepage`.

 


