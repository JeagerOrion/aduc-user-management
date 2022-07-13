const AD = require('ad');
const ldapJs = require('ldapjs');

const domainUrl = process.env.DOMAIN_URL;
const domainUser = process.env.DOMAIN_USER;
const domainUserPassword = process.env.DOMAIN_USER_PASSWORD;
const domainBaseDN = process.env.DOMAIN_BASE_DN;

const ad = new AD({
    url: domainUrl,
    user: domainUser,
    pass: domainUserPassword,
    baseDN: domainBaseDN
});

const ldapConfig = {
    url: domainUrl,
    connectionTimeOut: 30000,
    reconnect: true
}

const ldapClient = ldapJs.createClient(ldapConfig);

ldapClient.on('error', function (err) {
    console.log(err);
})


module.exports.renderNewUserForm = (req, res) => {
    res.render('create/create')
}

module.exports.createNewUser = (req, res) => {

    // Bind LDAP with server

    ldapClient.bind(domainUser, domainUserPassword, async (err) => {
        if (err) {
            console.log(err);
            return res.send('Something went wrong with binding LDAP');
        } else {

            // Destructure new user info from req.body.newUser

            console.log('Bind complete');
            const { firstName, lastName, emailDomain, office, jobTitle } = req.body.newUser;
            const userName = `${firstName}.${lastName}`;
            const commonName = `${firstName} ${lastName}`
            const email = userName + emailDomain;
            const organizationalUnit = 'OU=Users,OU=IT Dept,DC=whitesrfs,DC=loc'
            const distinguishedName = `CN=${firstName} ${lastName},OU=Users,OU=${office},DC=whitesrfs,DC=loc`

            //create newUser object

            const newUser = {
                cn: commonName,
                sn: lastName,
                mail: email,
                objectClass: 'user',
                userPrincipalName: email,
                sAMAccountName: userName,
                givenName: firstName,
                displayName: commonName
            }

            const userExists = await ad.user(userName).exists();

            if (!userExists) {
                //If the user doesn't exist try to add new user to Active Directory
                ldapClient.add(distinguishedName, newUser, err => {
                    if (err) {
                        console.log(err);
                        console.log(distinguishedName, newUser)
                        ldapClient.unbind();
                        console.log('Unbind complete');
                        return res.send('Something went wrong with adding the new user');
                    } else {
                        //Redirect on successful user creation
                        console.log('Success', newUser)
                        ldapClient.unbind();
                        console.log('Unbind complete');
                        return res.redirect('create/success')
                    }
                })
            } else {
                //If the user already exists, notify the creator


                console.log(`The user ${userName} already exists!`);
                ldapClient.unbind();
                console.log('Unbind complete');
                return res.redirect('create/duplicate');

            }
        }
    })
}

module.exports.success = (req, res) => {
    res.render('create/success')
}

module.exports.duplicate = (req, res) => {
    res.render('create/duplicate')
}