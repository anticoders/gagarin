import Chai from 'chai';
import chaiThings from 'chai-things';
import chaiSpies from 'chai-spies';


Chai.use(chaiThings);
Chai.use(chaiSpies);

Chai.should();

// global.chai = chai;

chai = Chai
