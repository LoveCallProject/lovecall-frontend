#include <stdio.h>

#ifdef __cplusplus
extern "C" {
#endif

int opusdec_main(int argc, char **argv);

#ifdef __cplusplus
}
#endif


int test_opusdec(void)
{
	char *argv[] = {"opusdec", "--help", NULL};
	return opusdec_main(2, argv);
}
