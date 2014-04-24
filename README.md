# Motivation

I'm interested in using password generators such as [hashapass][6],
[pwdhash][7], and [passwordmaker.org][1]. However there are just enough
annoyances I have with those options so I investigated creating a better one.

## Security

The other hash password generators tend to use insecure hashing methods and
none of them use slow hash functions (e.g. PBKDF2) to protect against brute
force attacks.

- hashapass uses 1 round of HMAC-SHA1.
- pwdhash uses 1 round of HMAC-MD5.
- passwordmaker.org allows you to pick various algorithms. But runs only 1
  iteration.

## Ease of Use

All of these other hash password generation sites use the domain + master
password to generate your password. The typical solution to when you want to
change a password is to append a number to the domain (e.g. "linkedin.com2").

Unfortunately there is just no way I could possibly remember what number to
append for which website. Combined with the increasing breaches of major
websites like LinkedIn or when Heartbleed was discovered, there is just no way
someone using these other solutions can remember large amounts of numbers to
append.

# Details

Hash0 uses [SJCL's][5] PBKDF2 implementation with 100,000 iterations to derive
password from a master password. On top of using PBKDF2, Hash0 uses an unique
salt per site. Hash0 attempts to use the closest possible thing in a browser to
a CSPRNG by utilizing [SJCL][5]'s code. In modern browsers, this basically
means obtaining data from window.crypto.getRandomValues().

Hash0 also borrows some functions from [PasswordMaker.org][1] when converting
generated result to the desired charset.

Finally, the salt and different site configurations are encrypted using SJCL's
encrypt() function and stored at a place of user's choosing. Storing these
settings remotely in encrypted form allows Hash0 to be used across different
devices.

Pros:

- Salted password different per site
- Uses PBKDF2-HMAC-SHA256
- Salt stored separately from website's password storage
- Synchronization of settings so I don't have to remember them (salt, password
  length, character set, etc)
- Still 1 password for multiple sites

Cons:

- Need storage elsewhere for encrypted setting (E.g. Google App Engine)

# Usage

Google Chrome:

- git clone and load unpacked extension using the hash0 directory as root

Firefox:

- See [this firefox plugin][4]

Web:

- Ideally you should use Hash0 with either the Chrome extension or the Firefox
  plugin. Doing so ensures that the files are not tampered with.
- Otherwise, knowing the risk you can still visit
  [https://hash0.dannysu.com][3] to access it. You need to import CA cert from
  cacert.org.

  [1]: http://PasswordMaker.org
  [2]: http://code.google.com/p/crypto-js/
  [3]: https://hash0.dannysu.com
  [4]: https://github.com/dannysu/hash0-firefox
  [5]: https://crypto.stanford.edu/sjcl/
  [6]: http://hashapass.com
  [7]: https://www.pwdhash.com/
