from setuptools import setup, find_packages

setup(
    name="promotion-gate",
    version="0.1.0",
    packages=find_packages(),
    install_requires=["fastapi>=0.109.0", "sqlalchemy>=2.0", "pymysql>=1.1.0", "pydantic>=2.5"],
)
