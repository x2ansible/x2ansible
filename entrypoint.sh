#!/bin/bash
set -e
exec streamlit run app.py --server.port=8080 --server.address=0.0.0.0
