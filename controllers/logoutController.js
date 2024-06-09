const usersDB = {
    users: require('../model/users.json'),
    setUsers: function (data) { this.users = data; }
}
const fsPromises = require('fs').promises;
const path = require('path');

const handleLogout = async (req, res) => {
    // on client also delete the access token in frontend

    const cookies = req.cookies;

    if (!cookies?.jwt) {
        console.log('No JWT cookie found');
        return res.sendStatus(204); // no content
    }

    const refreshToken = cookies.jwt;
    // console.log(`Refresh Token: ${refreshToken}`);

    const foundUser = usersDB.users.find(person => person.refreshToken === refreshToken);
    if (!foundUser) {
        console.log('User not found for the given refresh token');
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true});
        return res.sendStatus(204); 
    }

    // delete refreshtoken in db
    const otherUsers = usersDB.users.filter(person => person.refreshToken !== foundUser.refreshToken);

    const currentUser = { ...foundUser, refreshToken: ''};
    usersDB.setUsers([...otherUsers, currentUser]);



    await fsPromises.writeFile(
        path.join(__dirname, '..', 'model', 'users.json'),
        JSON.stringify(usersDB.users)
    );


    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true});
    console.log('Cleared cookie');
    res.sendStatus(204)

}

module.exports = { handleLogout };