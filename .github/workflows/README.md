EXPLICATION: https://gist.github.com/mikekeke/bb08b35144dc0ad5f42ab8dad6682e04
"set -euxo pipefail"

-e → exit immediately if any command returns a non-zero status.
-u → treat unset variables as an error (e.g., $FOO if FOO isn’t set).
-x → print each command before running it (good for debugging).
-o pipefail → in a pipeline (a | b | c), fail the whole pipeline if any stage fails (not just the last one).