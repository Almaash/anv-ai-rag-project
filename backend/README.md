# Anavaran Backend

A clean Laravel application with user authentication and management APIs.

## About

This is a fresh Laravel application configured with:
- User authentication (Register, Login, Logout)
- User management APIs
- Laravel Sanctum for API authentication
- MySQL database (anavaran_db)

## Requirements

- PHP >= 8.2
- Composer
- MySQL
- Laravel 11.x

## Installation

1. Clone the repository
2. Install dependencies:
```bash
composer install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Create database `anavaran_db` in MySQL

5. Update `.env` file with your database credentials

6. Generate application key:
```bash
php artisan key:generate
```

7. Run migrations:
```bash
php artisan migrate
```

8. (Optional) Seed default users:
```bash
php artisan db:seed
```

9. Start the development server:
```bash
php artisan serve
```

The application will be available at `http://localhost:8000`

## Default Users

After running the seeder, you can login with:

**Admin User:**
- Email: admin@anavaran.com
- Password: admin123

**Regular User:**
- Email: user@anavaran.com
- Password: user123

## API Documentation

See [API_DOCS.md](API_DOCS.md) for complete API documentation.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
