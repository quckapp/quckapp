from setuptools import setup, find_packages

setup(
    name="version-middleware",
    version="1.0.0",
    packages=find_packages(),
    install_requires=["starlette>=0.27.0"],
    extras_require={"test": ["pytest", "httpx", "fastapi"]},
)
