import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Standardize default environment variables for test executions
os.environ.setdefault('JWT_SECRET_KEY', 'test_jwt_secret_key_1234567890_vidnova_test_suite_key')
os.environ.setdefault('VNP_TMN_CODE', 'TESTTMN01')
os.environ.setdefault('VNP_HASH_SECRET', 'TESTHASHSECRET1234567890ABCDEF')
os.environ.setdefault('VNP_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
os.environ.setdefault('VNP_RETURN_URL', 'http://localhost:5173/payment/vnpay/return')
