import sys
print(f"Python Executable: {sys.executable}")
print(f"Path: {sys.path}")
try:
    import fastapi
    print(f"FastAPI Version: {fastapi.__version__}")
except ImportError as e:
    print(f"Import Error: {e}")
