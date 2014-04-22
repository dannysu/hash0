# Motivation
I'm interested in using password generators such as [hashapass][6],
[pwdhash][7], and [passwordmaker.org][1]. However, one annoyance I have with
hash based generators is that I still have to remember many configs for
different websites. E.g. When LinkedIn passwords leaked, I had to change the
hash param from "linkedin.com" to "linkedin.com2". When Heartbleed
vulnerability was discovered I had to change pretty much all my passwords. I
don't want to remember different config per site.

# Details
Hash0 uses SJCL PBKDF2 with 100,000 iterations to derive password from a
master password. The implementation of PBKDF2 is from [CryptoJS][2]. On top of
using PBKDF2, Hash0 uses an unique salt per site. Hash0 attempts to use the
closest possible thing in a browser to a CSPRNG by utilizing [SJCL][5]'s code.
In modern browsers, this basically means obtaining data from
window.crypto.getRandomValues().

Hash0 also borrows some functions from [PasswordMaker.org][1] when converting
generated result to the desired charset.

Finally, the salt and different site configurations are encrypted using SJCL's
encrypt() function and stored at a place of user's choosing. Storing these
settings remotely in encrypted form allows Hash0 to be used across different
devices.

Pros:

- Salted password different per site
- Salt stored separately from website's password storage
- Synchronization of settings so I don't have to remember them (salt, password
  length, character set, etc)
- Still 1 password for multiple sites

Cons:

- Need storage elsewhere for encrypted setting (E.g. Google App Engine)
- Slightly more things to remember (Need to know where settings are stored)

# Usage

Google Chrome:

- git clone and load unpacked extension using the hash0 directory as root

Firefox:

- See [this firefox plugin][4]

Web:

- Ideally you should use Hash0 with either the Chrome extension or the Firefox
  plugin. Doing so ensures that the files are not tampered with.
- Otherwise, knowing the risk you can still visit
  [https://hash0.dannysu.com][3] to access it

  [1]: http://PasswordMaker.org
  [2]: http://code.google.com/p/crypto-js/
  [3]: https://hash0.dannysu.com
  [4]: https://github.com/dannysu/hash0-firefox
  [5]: https://crypto.stanford.edu/sjcl/
  [6]: http://hashapass.com
  [7]: https://www.pwdhash.com/
