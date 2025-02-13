import argparse
import gdown
import logging
import os
import pandas as pd
import re
import sqlite3
logger = logging.getLogger(__name__)

urlid_theses_inventory="1M3O38PyxYVLeQslOEQQaiWmno_lKVlgS"

def register_tables(con, path):
    for track in ['langAI', 'HLT', 'PhD']:
        pd.read_excel(path, sheet_name=track, engine='openpyxl').to_sql(track, con)


def check_files(con):
    # os.makedirs('data/theses', exist_ok=True)
    flag = True
    pattern = re.compile("thesis_([A-Z][a-zA-Z\\-]+_)+20\\d\\d.pdf")
    for track in ['langAI', 'HLT', 'PhD']:
        data = [x[0] for x in con.cursor().execute(f"SELECT filename FROM {track}").fetchall() if x[0] is not None]
        for filename in data:
            if pattern.fullmatch(filename) is None:
                logger.warning(f"{track} thesis filename {filename} does not conform pattern.")
                flag = False
    return flag


def setup(force, download):
    if os.path.exists('static/data/theses.db'):
        os.replace('static/data/theses.db', 'static/data/theses.db.bck')
    xlpath = "static/data/theses_inventory.xlsx"
    if download:
        gdown.download(id=urlid_theses_inventory, output=xlpath)
    con = sqlite3.connect("static/data/theses.db")
    register_tables(con, xlpath)
    filenames_ok = check_files(con)
    if not filenames_ok and not force:
        os.replace('static/data/theses.db.bck', 'static/data/theses.db')
        logger.error("Refusing to replace database because of possible filename formatting errors. Rerun with -f to override.")
    


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-f', '--force', action='store_true', help="Force creation of database even if filename is non-conform")
    parser.add_argument('-D', '--nodownload', action='store_true', help="Do not (re)download theses inventory before creating database")
    args = parser.parse_args()
    setup(args.force, not args.nodownload)