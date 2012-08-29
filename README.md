[hash0.dannysu.com](http://hash0.dannysu.com)

# Motivation
I'm interested in using password generators such as hashapass, pwdhash, and
passwordmaker.org. However, one annoyance I have with hash based generators is
that I still have to remember many configs for different websites. E.g. When
LinkedIn passwords got out, I had to change the hash param from "linkedin.com"
to "linkedin.com2". I don't want to remember different config per site.

# Details
Hash0 makes use of [PasswordMaker.org][1] classes, but uses PBKDF2 with 100
rounds of SHA512 from [CryptoJS][2] instead to better protect the master
password. Also, hash0 uses a different salt for each site to further protect
the master password. The salt and different site configuration are stored at a
place of user's choosing so that the settings can be synchronized to all
clients.

Pros:

- Salted password different per site
- Salt stored separately from website's password storage
- Synchronization of settings so I don't have to remember them (salt, password length, character set, etc)
- Still 1 password for multiple sites

Cons:

- Need storage elsewhere for encrypted setting (E.g. Google App Engine)
- Slightly more things to remember (Need to know where settings are stored)

  [1]: http://PasswordMaker.org
  [2]: http://code.google.com/p/crypto-js/

