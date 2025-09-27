import firebase_admin
import requests
from firebase_admin import credentials, firestore, auth
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import os
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
from functools import wraps

# --- INITIALIZATION ---

# 1. Initialize Flask App
app = Flask(__name__)
# Allows your React frontend to communicate with this backend
CORS(app) 

# Load environment variables from .env file
load_dotenv()

# Get JWT secret key from environment variables
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

# 2. Initialize Firebase Admin SDK
# !!! IMPORTANT !!!
# Replace 'path/to/your/serviceAccountKey.json' with the actual path 
# to the service account key file you downloaded from Firebase.
try:
    cred = credentials.Certificate('qrt-backend/serviceAccountKey.json') 
    firebase_admin.initialize_app(cred)
    # Get a reference to the Firestore database
    db = firestore.client()
    print("Firebase connection successful.")
except Exception as e:
    print(f"Firebase connection failed: {e}")
    db = None

# --- DECORATORS ---

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(' ')[1]
            except IndexError:
                return jsonify({'message': 'Token is missing or invalid'}), 401
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            g.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if g.current_user['role'] != 'ADMIN':
            return jsonify({'message': 'Cannot perform that function!'}), 403
        return f(*args, **kwargs)
    return decorated

# --- API ENDPOINTS ---

## User Authentication
@app.route('/api/login', methods=['POST'])
def login():
    email = request.json.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    try:
        user = auth.get_user_by_email(email)
        # In a real app, you'd handle password verification here.
        # For this project, we just confirm the user exists.
        
        # Generate JWT
        token = jwt.encode({
            'uid': user.uid,
            'role': user.custom_claims.get('role') if user.custom_claims else 'PRE',
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'], algorithm="HS256")

        return jsonify({'token': token}), 200
    except Exception as e:
        return jsonify({'error': 'Invalid credentials or user not found', 'details': str(e)}), 404

## Ticket Management
@app.route('/api/tickets', methods=['POST'])
@token_required
def create_ticket():
    ticket_data = request.json
    if not ticket_data:
        return jsonify({'error': 'Request body cannot be empty'}), 400
    
    # Add server-side timestamps for accuracy
    ticket_data['createdAt'] = firestore.SERVER_TIMESTAMP
    ticket_data['updatedAt'] = firestore.SERVER_TIMESTAMP
    
    # Add the new ticket to the 'tickets' collection in Firestore
    db.collection('tickets').add(ticket_data)
    
    return jsonify({'message': 'Ticket created successfully'}), 201

@app.route('/api/tickets', methods=['GET'])
@token_required
def get_tickets():
    # In a real app, you'd add pagination and filtering here
    tickets_ref = db.collection('tickets').order_by('createdAt', direction=firestore.Query.DESCENDING).stream()
    tickets = []
    for doc in tickets_ref:
        ticket = doc.to_dict()
        ticket['id'] = doc.id # Include the document ID
        tickets.append(ticket)
        
    return jsonify(tickets), 200

@app.route('/api/tickets/<ticket_id>', methods=['PUT'])
@token_required
def update_ticket(ticket_id):
    update_data = request.json
    update_data['updatedAt'] = firestore.SERVER_TIMESTAMP
    
    db.collection('tickets').document(ticket_id).update(update_data)
    
    return jsonify({'message': 'Ticket updated successfully'}), 200

## Admin Management (Examples)
# You can expand these for other admin functionalities like error types, messages, etc.
@app.route('/api/users', methods=['POST'])
@admin_required
def add_user():
    user_data = request.json
    try:
        user = auth.create_user(
            email=user_data['email'],
            display_name=user_data['name'],
            # You should add a password field in your frontend form
            password=user_data.get('password', 'defaultPassword123') 
        )
        # Set a custom claim to define the user's role
        auth.set_custom_user_claims(user.uid, {'role': user_data['role']})
        
        return jsonify({'message': 'User created successfully', 'uid': user.uid}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
        
## NSDL Proxy Endpoint
@app.route('/api/nsdl/fetch-name', methods=['POST'])
def fetch_nsdl_name():
    request_data = request.json
    
    # This is a placeholder URL. Replace with the actual Nxtwave API endpoint.
    nxtwave_api_url = 'https://api.nxtwave.tech/nsdl/get-name' 
    
    # !!! IMPORTANT !!!
    # Securely store your API key. Using an environment variable is best practice.
    api_key = 'YOUR_SECRET_NXTWAVE_API_KEY' 
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    try:
        # Make the request to the Nxtwave backend
        response = requests.post(nxtwave_api_url, json=request_data, headers=headers)
        response.raise_for_status() # Raises an error for bad responses (4xx or 5xx)
        
        # Return the response from the Nxtwave API directly to your frontend
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.RequestException as e:
        return jsonify({'error': 'Failed to communicate with NSDL service', 'details': str(e)}), 500


# --- RUN THE APP ---
if __name__ == '__main__':
    # Runs the server on port 5000 by default.
    # You can access it at http://127.0.0.1:5000
    app.run(debug=True)