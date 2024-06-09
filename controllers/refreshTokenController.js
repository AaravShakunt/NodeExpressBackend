const usersDB = {
    users: require('../model/users.json'),
    setUsers: function (data) { this.users = data; }
}
const jwt = require('jsonwebtoken');
require('dotenv').config();

const handleRefreshToken = (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        console.log('No JWT cookie found');
        return res.sendStatus(401);
    }

    const refreshToken = cookies.jwt;
    console.log(`Refresh Token: ${refreshToken}`);

    const foundUser = usersDB.users.find(person => person.refreshToken === refreshToken);
    if (!foundUser) {
        console.log('User not found for the given refresh token');
        return res.sendStatus(403); // forbidden
    }

    // Verify the JWT
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
            if (err) {
                console.log('JWT verification error:', err);
                return res.sendStatus(403);
            }
            if (foundUser.username !== decoded.username) {
                console.log(`Username mismatch: expected ${foundUser.username} but got ${decoded.username}`);
                return res.sendStatus(403);
            }

            const accessToken = jwt.sign(
                { "username": decoded.username },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '30s' }
            );
            res.json({ accessToken });
        }
    );
}

module.exports = { handleRefreshToken };
