#!/usr/bin/env python
"""
Run script for the Wine App API
"""
import os
import sys

import uvicorn

from backend.src.core import settings


def main():
    """Run the API server"""
    # Get host and port from environment or settings
    host = os.getenv("HOST", "0.0.0.0")  
    port = int(os.getenv("PORT", "8000"))
    
    # Run uvicorn
    uvicorn.run(
        "backend.src.main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )

if __name__ == "__main__":
    main() 