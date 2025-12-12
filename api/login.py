from database import db_connect
from sqlalchemy import text

conn = db_connect()

# res = conn.execute(text("SELECT * FROM users"))
# res = res.mappings().all()
# print(res)

