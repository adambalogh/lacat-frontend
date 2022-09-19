import { Box, Container, Text, useColorModeValue } from '@chakra-ui/react';

export function Footer() {
  return (
    <Box
      bg={useColorModeValue('gray.50', 'gray.900')}
      color={useColorModeValue('gray.700', 'gray.200')}>
      <Container
        maxW={'6xl'}
        py={4} >
        <Text>© 2022 Lacat. All rights reserved. Made by Adam Balogh</Text>
      </Container>
    </Box>
  );
}

