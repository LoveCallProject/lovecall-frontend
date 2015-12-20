#include <stdio.h>

#ifdef __cplusplus
extern "C" {
#endif

int opusdec_main(int argc, const char *argv[]);

#ifdef __cplusplus
}
#endif


int opusdec_decode(const char *infile, const char *outfile)
{
	const char *argv[] = {"opusdec", "--quiet", infile, outfile, NULL};
	return opusdec_main(4, argv);
}
